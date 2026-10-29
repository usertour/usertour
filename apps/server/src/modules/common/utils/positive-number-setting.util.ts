/**
 * A positive number read from the environment, or the fallback when the
 * setting is unset, blank, not a number, or not positive. For the rate
 * limiters: a window of zero or a limit of zero has no meaning there, and a
 * limit of zero would refuse every request.
 *
 * Number(...) is load-bearing: env values are STRINGS, and the throttler
 * storage computes `Date.now() + ttl` — string concatenation would push the
 * expiry out millions of years and the window would never reset.
 */
export const positiveNumberSetting = (raw: unknown, fallback: number): number => {
  if (raw === undefined || raw === null) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
