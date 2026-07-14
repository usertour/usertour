import {
  DEFAULT_WIDGET_LOCALE,
  WIDGET_MESSAGES,
  getWidgetMessages,
  resolveWidgetIntlLocale,
  resolveWidgetLocale,
} from '../messages';

describe('resolveWidgetLocale', () => {
  it('matches dictionary keys exactly, any casing', () => {
    expect(resolveWidgetLocale('fr')).toBe('fr');
    expect(resolveWidgetLocale('FR')).toBe('fr');
    expect(resolveWidgetLocale('ja')).toBe('ja');
    expect(resolveWidgetLocale('zh-Hans')).toBe('zh-Hans');
  });

  it('routes Chinese by script through the region aliases', () => {
    expect(resolveWidgetLocale('zh')).toBe('zh-Hans');
    expect(resolveWidgetLocale('zh-CN')).toBe('zh-Hans');
    expect(resolveWidgetLocale('zh-SG')).toBe('zh-Hans');
    expect(resolveWidgetLocale('zh-TW')).toBe('zh-Hant');
    expect(resolveWidgetLocale('zh-HK')).toBe('zh-Hant');
    expect(resolveWidgetLocale('zh-MO')).toBe('zh-Hant');
  });

  it('honors an explicit script subtag in full language-script-region tags', () => {
    // Stock iOS/Android system locales — the tag says the script outright.
    expect(resolveWidgetLocale('zh-Hant-TW')).toBe('zh-Hant');
    expect(resolveWidgetLocale('zh-Hant-HK')).toBe('zh-Hant');
    expect(resolveWidgetLocale('zh-Hans-CN')).toBe('zh-Hans');
  });

  it('reduces regional variants to their primary language', () => {
    expect(resolveWidgetLocale('fr-CA')).toBe('fr');
    expect(resolveWidgetLocale('pt-BR')).toBe('pt');
    expect(resolveWidgetLocale('de-AT')).toBe('de');
  });

  it('falls back to English for unknown or missing locales', () => {
    expect(resolveWidgetLocale(undefined)).toBe(DEFAULT_WIDGET_LOCALE);
    expect(resolveWidgetLocale('')).toBe(DEFAULT_WIDGET_LOCALE);
    expect(resolveWidgetLocale('xx-YY')).toBe(DEFAULT_WIDGET_LOCALE);
    expect(resolveWidgetLocale('not a locale')).toBe(DEFAULT_WIDGET_LOCALE);
  });
});

describe('getWidgetMessages', () => {
  it('returns the resolved dictionary', () => {
    expect(getWidgetMessages('zh-Hant-TW')).toBe(WIDGET_MESSAGES['zh-Hant']);
    expect(getWidgetMessages('nonsense')).toBe(WIDGET_MESSAGES[DEFAULT_WIDGET_LOCALE]);
  });
});

describe('WIDGET_MESSAGES completeness', () => {
  const englishKeys = Object.keys(WIDGET_MESSAGES.en).sort();

  it.each(Object.keys(WIDGET_MESSAGES))('%s covers every key with non-empty text', (locale) => {
    const dictionary = WIDGET_MESSAGES[locale] as unknown as Record<string, string>;
    expect(Object.keys(dictionary).sort()).toEqual(englishKeys);
    for (const key of englishKeys) {
      expect(dictionary[key]).toEqual(expect.any(String));
      expect(dictionary[key]).not.toBe('');
    }
  });
});

describe('resolveWidgetIntlLocale', () => {
  it('keeps the raw locale when its language has a dictionary', () => {
    expect(resolveWidgetIntlLocale('fr-CA')).toBe('fr-CA');
    expect(resolveWidgetIntlLocale('zh-Hant-TW')).toBe('zh-Hant-TW');
  });

  it('passes English regional variants through', () => {
    expect(resolveWidgetIntlLocale('en-GB')).toBe('en-GB');
  });

  it('falls back to English when the language has no dictionary', () => {
    expect(resolveWidgetIntlLocale('xx-YY')).toBe(DEFAULT_WIDGET_LOCALE);
    expect(resolveWidgetIntlLocale(undefined)).toBe(DEFAULT_WIDGET_LOCALE);
  });
});
