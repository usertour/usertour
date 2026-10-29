import { positiveNumberSetting } from './positive-number-setting.util';

describe('positiveNumberSetting', () => {
  it('reads a positive number, as a string the way the environment gives it or as a number', () => {
    expect(positiveNumberSetting('250', 1)).toBe(250);
    expect(positiveNumberSetting(250, 1)).toBe(250);
    expect(positiveNumberSetting('0.5', 1)).toBe(0.5);
  });

  it('falls back when the setting is unset, blank, not a number, or not positive', () => {
    for (const raw of [undefined, null, '', ' ', 'many', '0', 0, '-5', 'Infinity', Number.NaN]) {
      expect(positiveNumberSetting(raw, 7)).toBe(7);
    }
  });
});
