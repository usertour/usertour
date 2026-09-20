import type { Localization } from '@usertour/types';

/**
 * A localization's translation page is addressed by its `code` — the one field
 * that is unique within a project. The locale tag is not: two localizations may
 * share a tag under different codes, and addressing the page by it opened (and
 * saved into) whichever of them came first.
 */
export const localizationRouteSegment = (localization: Pick<Localization, 'code'>): string =>
  encodeURIComponent(localization.code);

/**
 * `segment` is the already-decoded route param. Links minted before pages were
 * addressed by code carry the locale tag instead, so that still resolves when
 * no code matches.
 */
export const findLocalizationByRouteSegment = <T extends Pick<Localization, 'code' | 'locale'>>(
  localizations: readonly T[] | undefined,
  segment: string,
): T | undefined =>
  localizations?.find((localization) => localization.code === segment) ??
  localizations?.find((localization) => localization.locale === segment);
