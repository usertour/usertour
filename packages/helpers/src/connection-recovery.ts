import { parseAttributeWrite } from './attribute-write';
import { isObject } from './type-utils';

/**
 * Pure rules of the SDK's connection recovery (ADR 0018): what a socket
 * signal does to the connection state, how long to wait before a manual
 * reconnect, and which writes may be replayed. The socket service only wires
 * these to Socket.IO.
 */

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'rejected';

export type ConnectionSignal =
  /**
   * `ensureConnecting` was asked to open the socket: the first connect, a
   * credential change, or new credentials after a rejection. `hadConnected`
   * says whether this credential set was ever connected — a connect after a
   * rejection then counts as a reconnect and gets its evaluation.
   */
  | { type: 'connect_requested'; hadConnected?: boolean }
  | { type: 'connect' }
  | { type: 'disconnect'; reason: string }
  /**
   * `retryable` is the server's verdict (`err.data.retryable`, absent on an
   * older server → treated as retryable); `active` is Socket.IO's own flag:
   * true when its manager will retry by itself (a transport error), false
   * when it abandoned the socket (a handshake rejection).
   */
  | { type: 'connect_error'; retryable: boolean; active: boolean };

export type ConnectionAction =
  /** Resend the writes that failed while offline. */
  | 'replay'
  /** Ask the server for one content evaluation (`END_BATCH`). */
  | 'evaluate'
  /** Socket.IO will not reconnect by itself: schedule a manual `connect()`. */
  | 'schedule_reconnect'
  /** The server refused the credentials: stop until they change. */
  | 'stop';

export interface ConnectionTransition {
  state: ConnectionState;
  actions: ConnectionAction[];
}

/** Socket.IO's reason for a disconnect the client asked for. */
export const CLIENT_DISCONNECT_REASON = 'io client disconnect';
/** Socket.IO's reason for a disconnect the server forced — it will not reconnect. */
export const SERVER_DISCONNECT_REASON = 'io server disconnect';

/**
 * The connection state machine. `connecting` is the first connection of a
 * credential set; a drop after that is `reconnecting`, and a connect out of
 * `reconnecting` is the one that needs a fresh evaluation. A replay is always
 * attempted on connect — it is a no-op when nothing failed.
 */
export const reduceConnection = (
  state: ConnectionState,
  signal: ConnectionSignal,
): ConnectionTransition => {
  switch (signal.type) {
    case 'connect_requested':
      if (state === 'rejected' && signal.hadConnected === true) {
        return { state: 'reconnecting', actions: [] };
      }
      if (state === 'idle' || state === 'rejected') {
        return { state: 'connecting', actions: [] };
      }
      return { state, actions: [] };
    case 'connect':
      if (state === 'connected') {
        return { state, actions: [] };
      }
      return {
        state: 'connected',
        actions: state === 'reconnecting' ? ['replay', 'evaluate'] : ['replay'],
      };
    case 'disconnect':
      if (signal.reason === CLIENT_DISCONNECT_REASON) {
        return { state: 'idle', actions: [] };
      }
      if (signal.reason === SERVER_DISCONNECT_REASON) {
        return { state: 'reconnecting', actions: ['schedule_reconnect'] };
      }
      return { state: 'reconnecting', actions: [] };
    case 'connect_error': {
      if (!signal.retryable) {
        return { state: 'rejected', actions: ['stop'] };
      }
      // A first connection that fails stays `connecting` so the eventual
      // connect is not mistaken for a reconnect.
      const next: ConnectionState = state === 'connecting' ? 'connecting' : 'reconnecting';
      return { state: next, actions: signal.active ? [] : ['schedule_reconnect'] };
    }
    default:
      return { state, actions: [] };
  }
};

export const RECONNECT_BASE_DELAY_MS = 1000;
export const RECONNECT_MAX_DELAY_MS = 60_000;
/** ±25 % so a fleet of tabs does not reconnect in lockstep. */
export const RECONNECT_JITTER = 0.25;

/**
 * Delay before manual reconnect attempt `attempt` (0-based): 1 s doubling to
 * a 60 s cap, with jitter. `random` is injectable for tests.
 */
export const reconnectDelayMs = (attempt: number, random: () => number = Math.random): number => {
  const exponent = Math.max(0, Math.min(attempt, 30));
  const base = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** exponent, RECONNECT_MAX_DELAY_MS);
  const jitter = 1 - RECONNECT_JITTER + random() * RECONNECT_JITTER * 2;
  return Math.round(base * jitter);
};

/**
 * Whether a handshake rejection should be retried: the server's verdict when
 * it gave one (ADR 0018 §2), retryable when it did not (an older server).
 */
export const isRetryableHandshakeError = (error: unknown): boolean => {
  if (!isObject(error)) {
    return true;
  }
  const data = (error as { data?: unknown }).data;
  if (!isObject(data)) {
    return true;
  }
  return (data as { retryable?: unknown }).retryable !== false;
};

/** A failed key is replayed only this long after it failed (ADR 0018 §4). */
export const PENDING_WRITE_TTL_MS = 10 * 60_000;
/** A failed write is resent at most this many times before it is dropped. */
export const MAX_WRITE_REPLAYS = 1;

/** The attribute-bearing part of an UpsertUser / UpsertCompany payload. */
export interface ReplayableWrite {
  attributes?: Record<string, unknown>;
  membership?: Record<string, unknown>;
}

/** When each key of a failed write last failed, per field. */
export interface FailedKeyStamps {
  attributes: Record<string, number>;
  membership: Record<string, number>;
}

/** Everything of one kind that failed and still awaits a replay. */
export interface FailedWrite<T extends ReplayableWrite> {
  /** The merged payload, its `add` operations already stripped. */
  write: T;
  stamps: FailedKeyStamps;
  /** The most recent failure — what a write carrying no keys expires by. */
  failedAt: number;
  /** Connects that already resent it. */
  replays: number;
}

/**
 * Fold a newer failed write into the older ones of its kind: attributes and
 * membership merge key by key with the newer value winning, every other field
 * comes from the newer write. Keeping only the latest payload lost the keys
 * of an earlier one (ADR 0018 §4).
 */
export const mergeFailedWrite = <T extends ReplayableWrite>(
  previous: T | undefined,
  next: T,
): T => {
  if (!previous) {
    return next;
  }
  const merged: T = { ...previous, ...next };
  if (previous.attributes || next.attributes) {
    merged.attributes = { ...previous.attributes, ...next.attributes };
  }
  if (previous.membership || next.membership) {
    merged.membership = { ...previous.membership, ...next.membership };
  }
  return merged;
};

/**
 * Fold a failed write into the record of its kind. The merge happens before
 * the `add` strip: an `add` on a key replaces an older literal for it and
 * then leaves with the strip, so the literal is never replayed over an add
 * the server may have applied. Each key keeps the time it last failed; the
 * replay count carries over, so a record already resent once does not get
 * a second chance from an unrelated later failure.
 */
export const recordFailedWrite = <T extends ReplayableWrite>(
  previous: FailedWrite<T> | undefined,
  write: T,
  at: number,
): FailedWrite<T> => {
  const merged = mergeFailedWrite(previous?.write, write);
  const stripped = withFields(
    merged,
    stripNonIdempotentWrites(merged.attributes),
    stripNonIdempotentWrites(merged.membership),
  );
  const stamps = keepStampsOf(
    {
      attributes: { ...previous?.stamps.attributes, ...stampAll(write.attributes, at) },
      membership: { ...previous?.stamps.membership, ...stampAll(write.membership, at) },
    },
    stripped,
  );
  return { write: stripped, stamps, failedAt: at, replays: previous?.replays ?? 0 };
};

/**
 * Drop from a failed write the keys another write of its kind carries — one
 * acknowledged since, whose values the server now holds, or one just sent,
 * which must land after the replay rather than before it. Undefined once no
 * key is left: the newer write proves the identity or membership exists.
 */
export const retireWrittenKeys = <T extends ReplayableWrite>(
  record: FailedWrite<T>,
  written: ReplayableWrite,
): FailedWrite<T> | undefined => {
  const write = withoutWrittenKeys(record.write, written);
  if (!write) {
    return undefined;
  }
  return { ...record, write, stamps: keepStampsOf(record.stamps, write) };
};

/**
 * Drop the keys that failed longer ago than the window. A record with no
 * key left is kept while its last failure is recent — a bare group() still
 * creates the membership — and dropped once that is old too.
 */
export const withoutExpiredKeys = <T extends ReplayableWrite>(
  record: FailedWrite<T>,
  now: number,
  ttl: number,
): FailedWrite<T> | undefined => {
  const fresh = (key: string, stamps: Record<string, number>): boolean =>
    now - (stamps[key] ?? record.failedAt) <= ttl;
  const attributes = pickKeys(record.write.attributes, (key) =>
    fresh(key, record.stamps.attributes),
  );
  const membership = pickKeys(record.write.membership, (key) =>
    fresh(key, record.stamps.membership),
  );
  if (isEmptyRecord(attributes) && isEmptyRecord(membership) && now - record.failedAt > ttl) {
    return undefined;
  }
  const write = withFields(record.write, attributes, membership);
  return { ...record, write, stamps: keepStampsOf(record.stamps, write) };
};

/** The send each key was last carried by, per field. */
export interface SentKeySeqs {
  attributes: Record<string, number>;
  membership: Record<string, number>;
}

/** Note that `write` went out as send number `seq`: its keys now belong to it. */
export const noteSentKeys = (
  sent: SentKeySeqs | undefined,
  write: ReplayableWrite,
  seq: number,
): SentKeySeqs => ({
  attributes: { ...sent?.attributes, ...stampAll(write.attributes, seq) },
  membership: { ...sent?.membership, ...stampAll(write.membership, seq) },
});

/**
 * The part of send `seq` that no later send has carried: a key belongs to
 * its latest send, so an earlier one that fails must not register the key
 * and an earlier one that lands must not retire it. Undefined when the
 * write carried keys and a later send took every one of them; a write that
 * carried none is returned as it is.
 */
export const keysStillOwnedBy = <T extends ReplayableWrite>(
  write: T,
  sent: SentKeySeqs,
  seq: number,
): T | undefined => {
  if (isEmptyRecord(write.attributes) && isEmptyRecord(write.membership)) {
    return write;
  }
  const attributes = pickKeys(write.attributes, (key) => sent.attributes[key] === seq);
  const membership = pickKeys(write.membership, (key) => sent.membership[key] === seq);
  if (isEmptyRecord(attributes) && isEmptyRecord(membership)) {
    return undefined;
  }
  return withFields(write, attributes, membership);
};

/**
 * Drop from a failed write the keys an acknowledged write carried since: the
 * server now holds newer values for them, so replaying the old ones would
 * regress. Returns undefined when nothing is left to replay.
 */
export const withoutWrittenKeys = <T extends ReplayableWrite>(
  failed: T,
  written: ReplayableWrite,
): T | undefined => {
  const attributes = omitKeys(failed.attributes, written.attributes);
  const membership = omitKeys(failed.membership, written.membership);
  if (isEmptyRecord(attributes) && isEmptyRecord(membership)) {
    return undefined;
  }
  return withFields(failed, attributes, membership);
};

/** `write` with its attribute fields replaced; an absent field stays absent. */
const withFields = <T extends ReplayableWrite>(
  write: T,
  attributes: Record<string, unknown> | undefined,
  membership: Record<string, unknown> | undefined,
): T => {
  const { attributes: _attributes, membership: _membership, ...rest } = write;
  return {
    ...(rest as T),
    ...(attributes === undefined ? {} : { attributes }),
    ...(membership === undefined ? {} : { membership }),
  };
};

const omitKeys = (
  source: Record<string, unknown> | undefined,
  written: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!source || !written) {
    return source;
  }
  return pickKeys(source, (key) => !Object.prototype.hasOwnProperty.call(written, key));
};

const pickKeys = (
  source: Record<string, unknown> | undefined,
  keep: (key: string) => boolean,
): Record<string, unknown> | undefined => {
  if (!source) {
    return source;
  }
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    if (keep(key)) {
      result[key] = source[key];
    }
  }
  return result;
};

const stampAll = (
  record: Record<string, unknown> | undefined,
  at: number,
): Record<string, number> => {
  const stamps: Record<string, number> = {};
  for (const key of Object.keys(record ?? {})) {
    stamps[key] = at;
  }
  return stamps;
};

/** Only the stamps of keys the write still carries. */
const keepStampsOf = (stamps: FailedKeyStamps, write: ReplayableWrite): FailedKeyStamps => ({
  attributes: pickKeys(stamps.attributes, (key) =>
    Object.prototype.hasOwnProperty.call(write.attributes ?? {}, key),
  ) as Record<string, number>,
  membership: pickKeys(stamps.membership, (key) =>
    Object.prototype.hasOwnProperty.call(write.membership ?? {}, key),
  ) as Record<string, number>,
});

const isEmptyRecord = (record: Record<string, unknown> | undefined): boolean => {
  return !record || Object.keys(record).length === 0;
};

/**
 * The part of a write that is safe to send twice. After a timeout the SDK
 * cannot know whether the server applied the write before the acknowledgement
 * was lost, so an `add` — the one non-idempotent operation — is dropped from
 * a replay (ADR 0018 §4). Everything else merges the same way each time.
 */
export const stripNonIdempotentWrites = (
  attributes: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!attributes) {
    return attributes;
  }
  let result: Record<string, unknown> | undefined;
  for (const codeName of Object.keys(attributes)) {
    const parsed = parseAttributeWrite(attributes[codeName]);
    if (parsed.ok && parsed.write.kind === 'add') {
      result = result ?? { ...attributes };
      delete result[codeName];
    }
  }
  return result ?? attributes;
};
