import { toPixels } from './oembed-size.util';

describe('toPixels', () => {
  it('keeps a number and a numeric string, truncated to whole pixels', () => {
    expect(toPixels(400)).toBe(400);
    expect(toPixels('400')).toBe(400);
    expect(toPixels(400.5)).toBe(400);
  });

  it('reads a missing size as 0', () => {
    expect(toPixels(undefined)).toBe(0);
    expect(toPixels(null)).toBe(0);
    expect(toPixels('')).toBe(0);
  });

  it('does not read a percentage as pixels', () => {
    expect(toPixels('100%')).toBe(0);
    expect(toPixels('auto')).toBe(0);
  });
});
