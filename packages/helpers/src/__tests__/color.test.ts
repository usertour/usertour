import chroma from 'chroma-js';

import { generateStateColors, hexToHSLAString, hexToHSLString, hexToRGBStr } from '../color';

/**
 * Value-level pins for the color conversion primitives that back the
 * theme-settings → CSS-variable pipeline. Expected values are hand-computed
 * (pure hues have exact HSL forms) or taken from the generateStateColors
 * JSDoc examples — they are NOT derived by calling the implementation.
 */
describe('color conversions', () => {
  describe('hexToHSLString', () => {
    it.each([
      ['#ffffff', '0 0% 100%'],
      ['#000000', '0 0% 0%'],
      ['#ff0000', '0 100% 50%'],
      ['#00ff00', '120 100% 50%'],
      ['#0000ff', '240 100% 50%'],
      ['#ffff00', '60 100% 50%'],
      ['#00ffff', '180 100% 50%'],
      ['#ff00ff', '300 100% 50%'],
      ['#ff8000', '30.12 100% 50%'],
      ['#800080', '300 100% 25.1%'],
      ['#808080', '0 0% 50.2%'],
      ['#f00', '0 100% 50%'],
    ])('converts %s to "%s"', (hex, expected) => {
      expect(hexToHSLString(hex)).toBe(expected);
    });

    it('falls back to black for invalid input', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      expect(hexToHSLString('Auto')).toBe('0 0% 0%');
      expect(hexToHSLString('')).toBe('0 0% 0%');
      warn.mockRestore();
    });

    it('round-trips back to the exact authored hex (lossless at 8-bit)', () => {
      // Integer-rounded HSL drifted the rendered color by up to 1/255 from
      // the authored hex (#0B5FFF rendered as #0A60FF) — caught by the
      // zero-knowledge theme eval, invisible to eyes but fatal to any
      // design-token audit comparing hex values. Two decimals reconstruct
      // the exact channel; these hexes are the ones that drifted.
      for (const hex of ['#0b5fff', '#0b3fb0', '#e7eaf0', '#155eef', '#2a2ad5', '#cedcfb']) {
        const [h, s, l] = hexToHSLString(hex)
          .split(' ')
          .map((part) => Number.parseFloat(part));
        expect(chroma.hsl(h, s / 100, l / 100).hex()).toBe(hex);
      }
    });
  });

  describe('hexToRGBStr', () => {
    it.each([
      ['#336699', '51, 102, 153'],
      ['#ffffff', '255, 255, 255'],
      ['#f00', '255, 0, 0'],
    ])('converts %s to "%s"', (hex, expected) => {
      expect(hexToRGBStr(hex)).toBe(expected);
    });

    it('falls back to black for invalid input', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      expect(hexToRGBStr('Auto')).toBe('0, 0, 0');
      warn.mockRestore();
    });
  });

  describe('hexToHSLAString', () => {
    it('appends the opacity fraction after a slash', () => {
      expect(hexToHSLAString('#00ff00', 0.5)).toBe('120 100% 50% / 0.5');
      expect(hexToHSLAString('#ffffff', 0.45)).toBe('0 0% 100% / 0.45');
    });
  });

  describe('generateStateColors', () => {
    // The four documented examples from the function's JSDoc.
    it.each([
      ['#ffffff', '#155eef', '#e6eefd', '#ccdcfc'],
      ['#65a30d', '#f8fafc', '#86b643', '#5c940c'],
      ['#fecaca', '#65a30d', '#cfbe90', '#a0b256'],
      ['#4ade80', '#65a30d', '#55c753', '#61b8a1'],
    ])('bg %s + fg %s -> hover %s, active %s', (bg, fg, hover, active) => {
      expect(generateStateColors(bg, fg)).toEqual({ hover, active });
    });

    it('pins the dark-on-light inverse pair used by banner foreground states', () => {
      expect(generateStateColors('#155eef', '#ffffff')).toEqual({
        hover: '#3d7af2',
        active: '#1250cb',
      });
    });

    it('pins the mid-tone inversion quirk: blue bg + yellow fg yields active == bg', () => {
      // #0000ff has lightness 0.5, so active mixes with the INVERTED fg
      // (#0000ff itself) and lands back on the base color.
      expect(generateStateColors('#0000ff', '#ffff00')).toEqual({
        hover: '#2a2ad5',
        active: '#0000ff',
      });
    });
  });
});
