import { type LocalizationTranslationUnit, isHttpUrl, isMediaUrlUnitPath } from '@usertour/helpers';
import type { VersionTranslationUnitChange } from '@usertour/hooks';

/** Unit path → the translation the server is known to hold. */
export type TranslationBaseline = ReadonlyMap<string, string>;

/**
 * A media url the server would refuse — it takes absolute http(s) urls only,
 * since the SDK renders them verbatim into src/href. Blank is fine: it means
 * "use the original".
 */
export const isUnusableMediaUrl = (value: string): boolean => {
  const url = value.trim();
  return url !== '' && !isHttpUrl(url);
};

export const toTranslationBaseline = (
  units: readonly LocalizationTranslationUnit[],
): Map<string, string> => {
  return new Map(units.map((unit) => [unit.path, unit.translatedText]));
};

/**
 * What a save has to send: the units whose translation differs from the
 * baseline. An emptied translation is sent as `null` (clear) — a blank string
 * would mean "keep" to the server. A media url still being typed is held back
 * rather than sent: the server refuses the whole save over one unusable url,
 * which would block every other edit riding along. A held unit stays different
 * from the baseline, so it goes out by itself once it is a full url.
 */
export const diffTranslationUnits = (
  baseline: TranslationBaseline,
  units: readonly LocalizationTranslationUnit[],
): VersionTranslationUnitChange[] => {
  const changes: VersionTranslationUnitChange[] = [];
  for (const unit of units) {
    const saved = baseline.get(unit.path) ?? '';
    const current = unit.translatedText;
    if (current === saved) {
      continue;
    }
    if (current.trim() === '') {
      if (saved.trim() !== '') {
        changes.push({ path: unit.path, translation: null });
      }
      continue;
    }
    if (isMediaUrlUnitPath(unit.path) && isUnusableMediaUrl(current)) {
      continue;
    }
    changes.push({ path: unit.path, translation: current });
  }
  return changes;
};

/** The baseline once `changes` are known to be saved. */
export const advanceTranslationBaseline = (
  baseline: TranslationBaseline,
  changes: readonly VersionTranslationUnitChange[],
): Map<string, string> => {
  const next = new Map(baseline);
  for (const change of changes) {
    next.set(change.path, change.translation ?? '');
  }
  return next;
};
