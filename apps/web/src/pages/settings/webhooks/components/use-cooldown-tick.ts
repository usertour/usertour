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
  // Content key for the deps only — the computation reads the array itself
  // (no join/split round-trip).
  const key = timestamps.filter(Boolean).sort().join('|');
  // `tick` is a deliberate dependency: the timestamps (and so `key`) don't
  // change when a deadline PASSES — without re-running on our own firing,
  // only the first of several pending deadlines would ever get a timer (two
  // cooling endpoints: A expires, B's badge then lingers forever).
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` IS `timestamps`' content hash — depending on the array identity would re-arm every render
  useEffect(() => {
    const now = Date.now();
    const soonest = nextFutureDeadline(timestamps, now);
    if (soonest === null) {
      return;
    }
    // +1s margin so the re-render lands after the comparison flips. Clamped
    // to setTimeout's int32 ceiling (~24.8 days): an overflowing delay fires
    // IMMEDIATELY, and with `tick` in the deps that would be a render loop —
    // clamping turns a far-future deadline into a harmless re-arm instead,
    // so the hook carries no hidden "timestamps must be near" precondition.
    const timer = setTimeout(force, Math.min(soonest - now + 1000, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [key, tick]);
};
