/**
 * Delivery retry schedule (ADR 0010): 8 attempts spanning ~24 hours.
 *
 * The ladder is delivery-centric — long enough that a receiver outage of up
 * to a day self-heals with zero operator action (the shape a known competitor
 * ships with a 3-day horizon; ours caps at ~24h where the recovery value
 * plateaus and the delayed-job footprint halves). Between attempts the job
 * sleeps in the Redis delayed set: no worker slot, no socket, no timer per
 * job — the cost of waiting is a ~1-2KB job record.
 */
export const DELIVERY_ATTEMPTS = 8;

/** Delay before attempt N+1, indexed by attempts already made (1-based - 1). */
export const RETRY_DELAYS_MS: readonly number[] = [
  5_000, // 5s — transient blips (deploy, restart)
  60_000, // 1m
  10 * 60_000, // 10m
  60 * 60_000, // 1h
  4 * 60 * 60_000, // 4h
  8 * 60 * 60_000, // 8h
  12 * 60 * 60_000, // 12h — cumulative ≈ 25.4h
];

/**
 * Ceiling for honoring a 429's Retry-After — the LADDER's maximum gap, on
 * purpose: every legitimate backoff delay must stay under the reconcile
 * sweep's orphan threshold (largest gap + slack), or a message parked on a
 * long Retry-After would be mistaken for one whose job died with Redis and
 * get double-queued. A receiver may ask us to slow down, not to park the
 * message beyond the ladder's own horizon.
 */
export const RETRY_AFTER_MAX_MS = 12 * 60 * 60_000;

/** Attached to the thrown delivery error so the backoff strategy can read it. */
export interface RetryAfterCarrier {
  retryAfterMs?: number;
}

/**
 * Parse a Retry-After response header (RFC 9110: delta-seconds or HTTP-date)
 * into milliseconds from now. Returns null for absent/invalid/past values.
 */
export const parseRetryAfter = (header: unknown): number | null => {
  if (typeof header !== 'string' || header.trim() === '') {
    return null;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return seconds > 0 ? Math.round(seconds * 1000) : null;
  }
  const dateMs = Date.parse(header);
  if (Number.isNaN(dateMs)) {
    return null;
  }
  const delta = dateMs - Date.now();
  return delta > 0 ? delta : null;
};

/**
 * The delay BullMQ should apply before the next attempt: the ladder step for
 * this attempt count, raised to the receiver's Retry-After when it asked for
 * a longer pause (never shortened below the ladder — Retry-After is a floor
 * from the receiver, not permission to hammer), capped at RETRY_AFTER_MAX_MS.
 */
/**
 * The worker's backoffStrategy. Ladder position is the MESSAGE-lifecycle
 * attempt count: a continuation job (reconcile rebuild) carries the tries
 * already logged as `attemptOffset` — without adding it, a job resumed at
 * message-attempt 6 would restart from the 5s rung and burn its remaining
 * budget in about a minute, exactly the outage the 24h ladder exists for.
 */
export const deliveryBackoffStrategy = (
  attemptsMade: number,
  _type: string | undefined,
  error: Error | undefined,
  job: { data?: { attemptOffset?: number } } | undefined,
): number =>
  computeBackoffDelay(
    attemptsMade + (Number(job?.data?.attemptOffset) || 0),
    (error as RetryAfterCarrier | undefined)?.retryAfterMs,
  );

export const computeBackoffDelay = (attemptsMade: number, retryAfterMs?: number | null): number => {
  const index = Math.min(Math.max(attemptsMade, 1), RETRY_DELAYS_MS.length) - 1;
  const ladder = RETRY_DELAYS_MS[index];
  if (!retryAfterMs || retryAfterMs <= 0) {
    return ladder;
  }
  return Math.min(Math.max(ladder, retryAfterMs), RETRY_AFTER_MAX_MS);
};
