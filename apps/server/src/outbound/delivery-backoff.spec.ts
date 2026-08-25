import {
  DELIVERY_ATTEMPTS,
  RETRY_AFTER_MAX_MS,
  RETRY_DELAYS_MS,
  computeBackoffDelay,
  deliveryBackoffStrategy,
  parseRetryAfter,
} from './delivery-backoff';

describe('delivery-backoff', () => {
  it('ladder covers every retry of the attempt budget and spans ~24h', () => {
    expect(RETRY_DELAYS_MS).toHaveLength(DELIVERY_ATTEMPTS - 1);
    const totalMs = RETRY_DELAYS_MS.reduce((sum, delay) => sum + delay, 0);
    expect(totalMs).toBeGreaterThanOrEqual(24 * 60 * 60_000);
    expect(totalMs).toBeLessThanOrEqual(26 * 60 * 60_000);
  });

  it('computeBackoffDelay walks the ladder by attempts made', () => {
    expect(computeBackoffDelay(1)).toBe(5_000);
    expect(computeBackoffDelay(2)).toBe(60_000);
    expect(computeBackoffDelay(7)).toBe(12 * 60 * 60_000);
    // Out-of-range guard (a reconcile continuation can shrink the budget).
    expect(computeBackoffDelay(99)).toBe(12 * 60 * 60_000);
    expect(computeBackoffDelay(0)).toBe(5_000);
  });

  it('Retry-After raises the delay but never shortens the ladder, capped', () => {
    // Longer than the ladder step -> honored.
    expect(computeBackoffDelay(1, 120_000)).toBe(120_000);
    // Shorter than the ladder step -> ladder wins (it is a floor, not a fast-track).
    expect(computeBackoffDelay(3, 60_000)).toBe(600_000);
    // Abusive value -> capped.
    expect(computeBackoffDelay(1, 365 * 24 * 60 * 60_000)).toBe(RETRY_AFTER_MAX_MS);
    // Absent/invalid -> ladder.
    expect(computeBackoffDelay(2, null)).toBe(60_000);
    expect(computeBackoffDelay(2, 0)).toBe(60_000);
  });

  it('the Retry-After cap never exceeds the ladder max (reconcile orphan-line invariant)', () => {
    // If this grows past the largest ladder gap, the reconcile sweep's
    // orphan threshold silently under-covers legitimate silences and starts
    // double-queueing parked messages. Raise the orphan threshold with it.
    expect(RETRY_AFTER_MAX_MS).toBeLessThanOrEqual(Math.max(...RETRY_DELAYS_MS));
  });

  it('deliveryBackoffStrategy positions by MESSAGE-lifecycle attempts (offset included)', () => {
    // A reconcile continuation resuming at message-attempt 6 must wait the
    // 8h rung, not restart from 5s and burn its budget in a minute.
    expect(deliveryBackoffStrategy(1, undefined, undefined, { data: { attemptOffset: 5 } })).toBe(
      RETRY_DELAYS_MS[5],
    );
    // Fresh listener job: offset absent -> plain ladder.
    expect(deliveryBackoffStrategy(1, undefined, undefined, { data: {} })).toBe(5_000);
    expect(deliveryBackoffStrategy(2, undefined, undefined, undefined)).toBe(60_000);
    // Retry-After still rides through the error.
    const rateLimited = Object.assign(new Error('429'), { retryAfterMs: 120_000 });
    expect(deliveryBackoffStrategy(1, undefined, rateLimited, { data: {} })).toBe(120_000);
  });

  it('parseRetryAfter handles delta-seconds, HTTP-dates, and junk', () => {
    expect(parseRetryAfter('120')).toBe(120_000);
    expect(parseRetryAfter('0')).toBeNull();
    expect(parseRetryAfter('-5')).toBeNull();
    const inOneMinute = new Date(Date.now() + 60_000).toUTCString();
    const parsed = parseRetryAfter(inOneMinute);
    expect(parsed).toBeGreaterThan(55_000);
    expect(parsed).toBeLessThanOrEqual(60_000);
    expect(parseRetryAfter(new Date(Date.now() - 60_000).toUTCString())).toBeNull();
    expect(parseRetryAfter('soon')).toBeNull();
    expect(parseRetryAfter(undefined)).toBeNull();
    expect(parseRetryAfter('')).toBeNull();
  });
});
