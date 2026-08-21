import { useEffect, useReducer } from 'react';

/**
 * The soonest deadline still in the future, or null. Pure — extracted so the
 * re-arm logic is testable without a DOM.
 */
export const nextFutureDeadline = (
  timestamps: Array<string | null | undefined>,
  now: number,
): number | null => {
  const soonest = timestamps
    .filter((timestamp): timestamp is string => !!timestamp)
    .map((timestamp) => new Date(timestamp).getTime())
    .filter((time) => time > now)
    .reduce((min, time) => Math.min(min, time), Number.POSITIVE_INFINITY);
  return Number.isFinite(soonest) ? soonest : null;
};

/**
 * Re-renders the caller when the soonest FUTURE timestamp passes, so a
 * "Cooling down" badge computed against Date.now() disappears on schedule
 * instead of lingering until the next refetch. Cooldown windows run 1min-1h,
 * so a stale badge is the common case, not an edge.
 */
export const useCooldownTick = (timestamps: Array<string | null | undefined>) => {
  const [tick, force] = useReducer((count: number) => count + 1, 0);
  const key = timestamps.filter(Boolean).sort().join('|');
  // `tick` is a deliberate dependency: the timestamps (and so `key`) don't
  // change when a deadline PASSES — without re-running on our own firing,
  // only the first of several pending deadlines would ever get a timer (two
  // cooling endpoints: A expires, B's badge then lingers forever).
  useEffect(() => {
    const now = Date.now();
    const soonest = nextFutureDeadline(key.split('|'), now);
    if (soonest === null) {
      return;
    }
    // +1s margin so the re-render lands after the comparison flips.
    const timer = setTimeout(force, soonest - now + 1000);
    return () => clearTimeout(timer);
  }, [key, tick]);
};
