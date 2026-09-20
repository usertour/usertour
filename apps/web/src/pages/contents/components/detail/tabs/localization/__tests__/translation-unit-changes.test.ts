import type { LocalizationTranslationUnit } from '@usertour/helpers';

import {
  advanceTranslationBaseline,
  diffTranslationUnits,
  isUnusableMediaUrl,
  toTranslationBaseline,
} from '../translation-unit-changes';

const unit = (
  path: string,
  translatedText: string,
  optional = false,
): LocalizationTranslationUnit => ({
  path,
  sourceText: 'source',
  translatedText,
  optional,
});

const TEXT = 'steps/a/0.0.0:text.0.0';
const BUTTON = 'steps/a/0.0.1:button.text';
const IMAGE = 'steps/a/0.0.2:image.url';
const IMAGE_LINK = 'steps/a/0.0.2:image.link.url';
const INLINE_LINK = 'steps/a/0.0.0:text.0.1:link.url';

describe('diffTranslationUnits', () => {
  it('sends only the units that differ from the baseline', () => {
    const baseline = toTranslationBaseline([unit(TEXT, 'Bienvenue'), unit(BUTTON, '')]);
    expect(
      diffTranslationUnits(baseline, [unit(TEXT, 'Bienvenue'), unit(BUTTON, 'Suivant')]),
    ).toEqual([{ path: BUTTON, translation: 'Suivant' }]);
    expect(diffTranslationUnits(baseline, [unit(TEXT, 'Bienvenue'), unit(BUTTON, '')])).toEqual([]);
  });

  it('sends an emptied translation as null — a blank string would mean "keep"', () => {
    const baseline = toTranslationBaseline([
      unit(TEXT, 'Bienvenue'),
      unit(IMAGE, 'https://a.test/fr.png', true),
    ]);
    expect(diffTranslationUnits(baseline, [unit(TEXT, '   '), unit(IMAGE, '', true)])).toEqual([
      { path: TEXT, translation: null },
      { path: IMAGE, translation: null },
    ]);
  });

  it('sends nothing for a unit that was and still is blank', () => {
    const baseline = toTranslationBaseline([unit(TEXT, '')]);
    expect(diffTranslationUnits(baseline, [unit(TEXT, '  ')])).toEqual([]);
  });

  it('holds back a half-typed media url without blocking the other edits', () => {
    const baseline = toTranslationBaseline([unit(TEXT, ''), unit(IMAGE_LINK, '', true)]);
    const typing = [unit(TEXT, 'Bienvenue'), unit(IMAGE_LINK, 'exam', true)];
    expect(diffTranslationUnits(baseline, typing)).toEqual([
      { path: TEXT, translation: 'Bienvenue' },
    ]);

    // Once the text is saved, the finished url goes out by itself.
    const afterText = advanceTranslationBaseline(baseline, [
      { path: TEXT, translation: 'Bienvenue' },
    ]);
    const finished = [unit(TEXT, 'Bienvenue'), unit(IMAGE_LINK, 'https://example.com/fr', true)];
    expect(diffTranslationUnits(afterText, finished)).toEqual([
      { path: IMAGE_LINK, translation: 'https://example.com/fr' },
    ]);
  });

  it('does not hold an inline text link to the media bar', () => {
    const baseline = toTranslationBaseline([unit(INLINE_LINK, '', true)]);
    expect(diffTranslationUnits(baseline, [unit(INLINE_LINK, '/fr/pricing', true)])).toEqual([
      { path: INLINE_LINK, translation: '/fr/pricing' },
    ]);
  });
});

describe('advanceTranslationBaseline', () => {
  it('records saved values, a cleared unit as blank, and leaves the input untouched', () => {
    const baseline = toTranslationBaseline([unit(TEXT, 'Bienvenue'), unit(BUTTON, '')]);
    const next = advanceTranslationBaseline(baseline, [
      { path: TEXT, translation: null },
      { path: BUTTON, translation: 'Suivant' },
    ]);
    expect(next.get(TEXT)).toBe('');
    expect(next.get(BUTTON)).toBe('Suivant');
    expect(baseline.get(TEXT)).toBe('Bienvenue');
  });

  it('a failed save (baseline not advanced) is carried by the next diff', () => {
    const baseline = toTranslationBaseline([unit(TEXT, ''), unit(BUTTON, '')]);
    // First flush failed: TEXT stays unsaved. A later edit touches BUTTON only.
    const later = [unit(TEXT, 'Bienvenue'), unit(BUTTON, 'Suivant')];
    expect(diffTranslationUnits(baseline, later)).toEqual([
      { path: TEXT, translation: 'Bienvenue' },
      { path: BUTTON, translation: 'Suivant' },
    ]);
  });
});

describe('isUnusableMediaUrl', () => {
  it('flags anything but blank or a full http(s) url', () => {
    expect(isUnusableMediaUrl('')).toBe(false);
    expect(isUnusableMediaUrl('  ')).toBe(false);
    expect(isUnusableMediaUrl(' https://example.com/a.png ')).toBe(false);
    expect(isUnusableMediaUrl('exam')).toBe(true);
    expect(isUnusableMediaUrl('/uploads/a.png')).toBe(true);
  });
});
