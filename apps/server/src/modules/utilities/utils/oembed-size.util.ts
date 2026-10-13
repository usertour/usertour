/**
 * An oEmbed size as a whole number of pixels. Providers send numbers or
 * numeric strings, omit the field, or send a percentage ("100%"); only a
 * plain number counts, anything else is 0 so the widget falls back to its
 * default height instead of treating a percentage as pixels.
 */
export const toPixels = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};
