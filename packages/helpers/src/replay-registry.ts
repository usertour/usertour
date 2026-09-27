import {
  type FailedWrite,
  keysStillOwnedBy,
  MAX_WRITE_REPLAYS,
  noteSentKeys,
  PENDING_WRITE_TTL_MS,
  recordFailedWrite,
  type ReplayableWrite,
  retireWrittenKeys,
  type SentKeySeqs,
  withoutExpiredKeys,
} from './connection-recovery';

/**
 * The writes that failed for a transport reason and await a resend on the
 * next connect (ADR 0018 §4), as one pure object with five actions: a write
 * was sent, a replay is due, a replay was answered, a write got no answer,
 * the session was reset. The socket service only forwards its outcomes;
 * every timing rule lives here, where a table of scenarios can test it.
 *
 * Invariants:
 * - One record per kind (user, company), merged key by key, `add` stripped.
 * - A key belongs to its latest send. A newer write retires the keys it
 *   carries the moment it is sent; an earlier send that fails afterwards
 *   registers only the keys no later send took; an earlier send that lands
 *   retires only those.
 * - A record holds one user and, for a company write, one company: a write
 *   for another target is never merged, and a record for a target the
 *   session has left is dropped instead of replayed.
 * - A reset or an identity change ends an epoch: a send from before it can
 *   neither register a failure nor be folded into the session after it.
 * - A key is not resent more than `ttlMs` after it failed; a record is not
 *   resent more than `maxReplays` times.
 */
export type WriteKind = 'user' | 'company';

/** The identity the session is on now, as the socket credentials name it. */
export interface WriteTarget {
  externalUserId?: string;
  externalCompanyId?: string;
}

export interface TargetedWrite extends ReplayableWrite, WriteTarget {
  token?: string;
}

/** Handed out by `sent` and `startReplay`; identifies the send for its outcome. */
export interface SendTicket {
  seq: number;
  epoch: number;
}

export type ReplayStart<T> =
  | { kind: 'nothing' }
  | { kind: 'refused'; reason: string }
  | { kind: 'send'; write: T; ticket: SendTicket };

export interface ReplayRegistryOptions {
  ttlMs?: number;
  maxReplays?: number;
  now?: () => number;
}

export class ReplayRegistry<T extends TargetedWrite> {
  private readonly records = new Map<WriteKind, FailedWrite<T>>();
  private readonly sentSeqs = new Map<WriteKind, SentKeySeqs>();
  private epoch = 0;
  private seq = 0;
  private readonly ttlMs: number;
  private readonly maxReplays: number;
  private readonly now: () => number;

  constructor(options: ReplayRegistryOptions = {}) {
    this.ttlMs = options.ttlMs ?? PENDING_WRITE_TTL_MS;
    this.maxReplays = options.maxReplays ?? MAX_WRITE_REPLAYS;
    this.now = options.now ?? Date.now;
  }

  /** Whether a record of this kind awaits a replay. */
  has(kind: WriteKind): boolean {
    return this.records.has(kind);
  }

  /** A write goes out: its keys now belong to this send and leave the record. */
  sent(kind: WriteKind, write: T): SendTicket {
    const ticket = this.nextTicket(kind, write);
    this.retire(kind, write);
    return ticket;
  }

  /**
   * A write got no answer. Registered for the target the session is on now,
   * in the epoch it was sent in, with the keys no later send has carried.
   */
  failed(kind: WriteKind, ticket: SendTicket, write: T, target: WriteTarget): void {
    if (ticket.epoch !== this.epoch || !isSameTarget(kind, write, target)) {
      return;
    }
    const owned = keysStillOwnedBy(write, this.sentKeys(kind), ticket.seq);
    if (!owned) {
      return;
    }
    const previous = this.records.get(kind);
    const mergeable = previous && isSameTarget(kind, previous.write, owned) ? previous : undefined;
    // Registered even when the strip leaves no key: the resend still does
    // what the write did besides its attributes — a group() creates the
    // membership — and an attribute-less user resend costs one upsert.
    this.records.set(kind, recordFailedWrite(mergeable, owned, this.now()));
  }

  /**
   * What to resend for this kind on a connect: the record with its expired
   * keys dropped and the token of now, counted as an attempt before it goes
   * out — so a record replaced while the replay is out still carries the
   * count, which an answer resets. A record the session has left, or already
   * resent that many times without an answer, is dropped with the reason.
   */
  startReplay(kind: WriteKind, target: WriteTarget, token: string | undefined): ReplayStart<T> {
    const recorded = this.records.get(kind);
    if (!recorded) {
      return { kind: 'nothing' };
    }
    const fresh = withoutExpiredKeys(recorded, this.now(), this.ttlMs);
    const refusal = fresh
      ? this.refusal(kind, fresh, target)
      : 'it is older than the replay window';
    if (!fresh || refusal) {
      this.records.delete(kind);
      return { kind: 'refused', reason: refusal ?? 'it is older than the replay window' };
    }
    const pending = { ...fresh, replays: fresh.replays + 1 };
    this.records.set(kind, pending);
    const write = { ...pending.write, token } as T;
    return { kind: 'send', write, ticket: this.nextTicket(kind, write) };
  }

  /**
   * A replay was answered. Retires the keys this send still owns and says
   * whether the session may fold the write into its cache: not after a reset
   * or an identity change, and not for a target the session has left.
   */
  replayAnswered(kind: WriteKind, ticket: SendTicket, write: T, target: WriteTarget): boolean {
    if (ticket.epoch !== this.epoch) {
      return false;
    }
    const landed = keysStillOwnedBy(write, this.sentKeys(kind), ticket.seq);
    if (landed) {
      this.retire(kind, landed);
    }
    // The count is of unanswered replays: what remains on record now came
    // from newer writes and gets its own attempt.
    const remaining = this.records.get(kind);
    if (remaining && isSameTarget(kind, remaining.write, write)) {
      this.records.set(kind, { ...remaining, replays: 0 });
    }
    return isSameTarget(kind, write, target);
  }

  /** The session ended: nothing from before it is resent or folded in. */
  reset(): void {
    this.records.clear();
    this.sentSeqs.clear();
    this.epoch += 1;
  }

  private nextTicket(kind: WriteKind, write: T): SendTicket {
    this.seq += 1;
    this.sentSeqs.set(kind, noteSentKeys(this.sentSeqs.get(kind), write, this.seq));
    return { seq: this.seq, epoch: this.epoch };
  }

  private sentKeys(kind: WriteKind): SentKeySeqs {
    return this.sentSeqs.get(kind) ?? { attributes: {}, membership: {} };
  }

  private retire(kind: WriteKind, write: T): void {
    const record = this.records.get(kind);
    if (!record || !isSameTarget(kind, record.write, write)) {
      return;
    }
    const remaining = retireWrittenKeys(record, write);
    if (remaining) {
      this.records.set(kind, remaining);
    } else {
      this.records.delete(kind);
    }
  }

  private refusal(
    kind: WriteKind,
    record: FailedWrite<T>,
    target: WriteTarget,
  ): string | undefined {
    if (record.replays >= this.maxReplays) {
      return 'it was already resent and the server did not answer';
    }
    if (!isSameTarget(kind, record.write, target)) {
      return kind === 'user'
        ? 'it belongs to another user'
        : 'the SDK is no longer on that company';
    }
    return undefined;
  }
}

/** Whether a write and a target name the same user and, for a company write, the same company. */
const isSameTarget = (kind: WriteKind, write: WriteTarget, target: WriteTarget): boolean => {
  if (write.externalUserId !== target.externalUserId) {
    return false;
  }
  return kind === 'user' || write.externalCompanyId === target.externalCompanyId;
};
