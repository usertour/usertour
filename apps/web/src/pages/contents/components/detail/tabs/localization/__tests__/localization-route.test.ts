import { findLocalizationByRouteSegment, localizationRouteSegment } from '../localization-route';

const french = { id: '1', code: 'fr', locale: 'fr-FR' };
const frenchEnterprise = { id: '2', code: 'fr-enterprise', locale: 'fr-FR' };
const german = { id: '3', code: 'de', locale: 'de' };

describe('localization route addressing', () => {
  it('tells apart two localizations that share a locale tag', () => {
    const list = [french, frenchEnterprise];
    const segment = decodeURIComponent(localizationRouteSegment(frenchEnterprise));
    expect(findLocalizationByRouteSegment(list, segment)).toBe(frenchEnterprise);
    expect(findLocalizationByRouteSegment(list, 'fr')).toBe(french);
  });

  it('prefers a code match over another localization whose locale tag equals it', () => {
    const tagged = { id: '4', code: 'german', locale: 'de' };
    expect(findLocalizationByRouteSegment([tagged, german], 'de')).toBe(german);
  });

  it('still resolves a link that carries the locale tag', () => {
    expect(findLocalizationByRouteSegment([french, german], 'fr-FR')).toBe(french);
  });

  it('escapes a code for use as one path segment', () => {
    expect(localizationRouteSegment({ code: 'zh/Hans 1' })).toBe('zh%2FHans%201');
  });

  it('finds nothing in an unloaded or non-matching list', () => {
    expect(findLocalizationByRouteSegment(undefined, 'fr')).toBeUndefined();
    expect(findLocalizationByRouteSegment([french], 'es')).toBeUndefined();
  });
});
