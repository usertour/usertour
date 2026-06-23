import { defaultSettings } from '@usertour/types';
import { generateStateColors } from '../color';
import { deepClone } from '../utils';
import { deepMergeThemeSettings } from '../convert-settings';
import { deriveThemeAutoColors } from '../derive-theme';

describe('deriveThemeAutoColors', () => {
  it('recomputes brand/main auto colors from the (changed) base colors', () => {
    const base = deepClone(defaultSettings);
    base.brandColor.background = '#ff0000';
    const out = deriveThemeAutoColors(base);

    const expected = generateStateColors('#ff0000', base.brandColor.color);
    expect(out.brandColor.autoHover).toBe(expected.hover);
    expect(out.brandColor.autoActive).toBe(expected.active);
    // recomputed from the new red base, not the original default's value
    expect(out.brandColor.autoHover).not.toBe(defaultSettings.brandColor.autoHover);
  });

  it('mirrors the resolved color for secondary button text (no state generation)', () => {
    const out = deriveThemeAutoColors(deepClone(defaultSettings));
    const resolved =
      defaultSettings.buttons.secondary.textColor.color === 'Auto'
        ? defaultSettings.brandColor.background
        : defaultSettings.buttons.secondary.textColor.color;
    expect(out.buttons.secondary.textColor.autoHover).toBe(resolved);
    expect(out.buttons.secondary.textColor.autoActive).toBe(resolved);
  });

  it('does not mutate its input', () => {
    const input = deepClone(defaultSettings);
    const before = JSON.stringify(input);
    deriveThemeAutoColors(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('deepMergeThemeSettings', () => {
  it('overlays a partial patch and preserves untouched fields', () => {
    const out = deepMergeThemeSettings(defaultSettings, { font: { fontSize: 18 } } as never);
    expect(out.font.fontSize).toBe(18);
    // a sibling font field and an unrelated group are preserved
    expect(out.font.lineHeight).toBe(defaultSettings.font.lineHeight);
    expect(out.brandColor).toEqual(defaultSettings.brandColor);
  });

  it('does not mutate the base', () => {
    const before = JSON.stringify(defaultSettings);
    deepMergeThemeSettings(defaultSettings, { modal: { width: 480 } } as never);
    expect(JSON.stringify(defaultSettings)).toBe(before);
  });
});
