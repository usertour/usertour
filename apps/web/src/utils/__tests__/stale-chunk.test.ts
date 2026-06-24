import { isStaleChunkError } from '../stale-chunk';

describe('isStaleChunkError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://app.usertour.io/assets/index-5f5afb90.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
  ])('matches the stale-chunk wording: %s', (message) => {
    expect(isStaleChunkError(new Error(message))).toBe(true);
    expect(isStaleChunkError(message)).toBe(true); // also accepts a raw string
  });

  it('does not match unrelated errors', () => {
    expect(isStaleChunkError(new Error('Network request failed'))).toBe(false);
    expect(isStaleChunkError(new TypeError('x is not a function'))).toBe(false);
  });

  it('handles non-error values safely', () => {
    expect(isStaleChunkError(undefined)).toBe(false);
    expect(isStaleChunkError(null)).toBe(false);
    expect(isStaleChunkError({ message: 'Failed to fetch dynamically imported module' })).toBe(
      false,
    );
  });
});
