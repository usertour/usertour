import { useEffect, useReducer } from 'react';

/**
 * Re-renders the caller when the soonest FUTURE timestamp passes, so a
 * "Cooling down" badge computed against Date.now() disappears on schedule
 * instead of lingering until the next refetch. Cooldown windows run 1min-1h,
 * so a stale badge is the common case, not an edge.
 */
export const useCooldownTick = (timestamps: Array<string | null | undefined>) => {
  const [, force] = useReducer((tick: number) => tick + 1, 0);
  // Stable key: re-arm only when the set of future deadlines changes (or one
  // fires, which changes the set by construction).
  const key = timestamps.filter(Boolean).sort().join('|');
  useEffect(() => {
    const now = Date.now();
    const soonest = key
      .split('|')
      .filter(Boolean)
      .map((timestamp) => new Date(timestamp).getTime())
      .filter((time) => time > now)
      .reduce((min, time) => Math.min(min, time), Number.POSITIVE_INFINITY);
    if (!Number.isFinite(soonest)) {
      return;
    }
    // +1s margin so the re-render lands after the comparison flips.
    const timer = setTimeout(force, soonest - now + 1000);
    return () => clearTimeout(timer);
  }, [key]);
};
