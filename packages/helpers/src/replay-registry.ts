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
 * - One record per target (kind, user, company), merged key by key, `add`
 *   stripped. A failure for another target is its own record: a failed
 *   group() to company B leaves company A's failed update where it is, so
 *   the rollback to A still has it.
 * - A key belongs to its latest send **to the same target**. A newer write
 *   retires the keys it carries the moment it is sent; an earlier send that
 *   fails afterwards registers only the keys no later send took; an earlier
 *   send that lands retires only those. A write to another company owns
 *   nothing of this one's.
 * - On a connect, the record for the target the session is on now is resent;
 *   the records for targets the session has left are dropped, never replayed.
 * - A reset or an identity change ends an epoch: a send from before it can
 *   neither register a failure nor be folded into the session after it.
 * - A key is not resent more than `ttlMs` after it failed; a record is not
 *   resent more than `maxReplays` times.
 */
export type WriteKind = 'user' | 'company';

/** The identity the session is on now, as the core names it. */
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

export type ReplayStart<T> = {
  /** Why each record for a target the session has left was dropped. */
  dropped: string[];
} & (
  | { kind: 'nothing' }
  | { kind: 'refused'; reason: string }
  | { kind: 'send'; write: T; ticket: SendTicket }
);

export interface ReplayRegistryOptions {
  ttlMs?: number;
  maxReplays?: number;
  now?: () => number;
}

export class ReplayRegistry<T extends TargetedWrite> {
  /** Per target key (see `targetKey`): the failed write awaiting a resend. */
  private readonly records = new Map<string, FailedWrite<T>>();
  /** Per target: which send each key was last carried by. */
  private readonly sentSeqs = new Map<string, SentKeySeqs>();
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

  /** Whether any record of this kind awaits a replay. */
  has(kind: WriteKind): boolean {
    for (const key of this.records.keys()) {
      if (kindOf(key) === kind) {
        return true;
      }
    }
    return false;
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
    const owned = keysStillOwnedBy(write, this.sentKeys(kind, write), ticket.seq);
    if (!owned) {
      return;
    }
    const key = targetKey(kind, owned);
    // Registered even when the strip leaves no key: the resend still does
    // what the write did besides its attributes — a group() creates the
    // membership — and an attribute-less user resend costs one upsert.
    this.records.set(key, recordFailedWrite(this.records.get(key), owned, this.now()));
  }

  /**
   * What to resend for this kind on a connect: the record for the target the
   * session is on now, with its expired keys dropped and the token of now,
   * counted as an attempt before it goes out — so a record replaced while
   * the replay is out still carries the count, which an answer resets. The
   * records for targets the session has left are dropped with their reason;
   * so is a record already resent that many times without an answer.
   */
  startReplay(kind: WriteKind, target: WriteTarget, token: string | undefined): ReplayStart<T> {
    const dropped: string[] = [];
    const current = targetKey(kind, target);
    for (const key of [...this.records.keys()]) {
      if (kindOf(key) === kind && key !== current) {
        this.records.delete(key);
        dropped.push(
          kind === 'user' ? 'it belongs to another user' : 'the SDK is no longer on that company',
        );
      }
    }
    const recorded = this.records.get(current);
    if (!recorded) {
      return { kind: 'nothing', dropped };
    }
    const fresh = withoutExpiredKeys(recorded, this.now(), this.ttlMs);
    if (!fresh) {
      this.records.delete(current);
      return { kind: 'refused', reason: 'it is older than the replay window', dropped };
    }
    if (fresh.replays >= this.maxReplays) {
      this.records.delete(current);
      return {
        kind: 'refused',
        reason: 'it was already resent and the server did not answer',
        dropped,
      };
    }
    const pending = { ...fresh, replays: fresh.replays + 1 };
    this.records.set(current, pending);
    const write = { ...pending.write, token } as T;
    return { kind: 'send', write, ticket: this.nextTicket(kind, write), dropped };
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
    const landed = keysStillOwnedBy(write, this.sentKeys(kind, write), ticket.seq);
    if (landed) {
      this.retire(kind, landed);
    }
    // The count is of unanswered replays: what remains on record now came
    // from newer writes and gets its own attempt.
    const key = targetKey(kind, write);
    const remaining = this.records.get(key);
    if (remaining) {
      this.records.set(key, { ...remaining, replays: 0 });
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
    const key = targetKey(kind, write);
    this.sentSeqs.set(key, noteSentKeys(this.sentSeqs.get(key), write, this.seq));
    return { seq: this.seq, epoch: this.epoch };
  }

  private sentKeys(kind: WriteKind, write: WriteTarget): SentKeySeqs {
    return this.sentSeqs.get(targetKey(kind, write)) ?? { attributes: {}, membership: {} };
  }

  private retire(kind: WriteKind, write: T): void {
    const key = targetKey(kind, write);
    const record = this.records.get(key);
    if (!record) {
      return;
    }
    const remaining = retireWrittenKeys(record, write);
    if (remaining) {
      this.records.set(key, remaining);
    } else {
      this.records.delete(key);
    }
  }
}

const SEPARATOR = '\u0000';

const targetKey = (kind: WriteKind, write: WriteTarget): string => {
  const company = kind === 'company' ? (write.externalCompanyId ?? '') : '';
  return `${kind}${SEPARATOR}${write.externalUserId ?? ''}${SEPARATOR}${company}`;
};

const kindOf = (key: string): WriteKind => key.slice(0, key.indexOf(SEPARATOR)) as WriteKind;

/** Whether a write and a target name the same user and, for a company write, the same company. */
const isSameTarget = (kind: WriteKind, write: WriteTarget, target: WriteTarget): boolean => {
  if (write.externalUserId !== target.externalUserId) {
    return false;
  }
  return kind === 'user' || write.externalCompanyId === target.externalCompanyId;
};
