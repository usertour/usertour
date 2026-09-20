/**
 * Translation-unit view over a version's stored translation row — the model
 * every surface reads and writes translations in (the dashboard's editor and
 * its export/import, REST, MCP). Pure: no DB, no network
 * (VersionTranslationService adds both). Every walk/graft rule lives in
 * @usertour/helpers, so the dashboard's editor and the server can never disagree
 * on which text is translatable or how a unit is addressed.
 *
 * Addressing: a flow unit is `steps/<step cvid>/<unit path>`; every other type
 * uses the walker's unit path as-is.
 */
import {
  type LocalizationTranslationUnit,
  type TranslationUnitChanges,
  applyContentsTranslationUnits,
  applyVersionDataTranslationUnits,
  buildLocalizedFlowBackup,
  buildLocalizedFlowSavePayload,
  buildLocalizedVersionDataBackup,
  buildLocalizedVersionDataSavePayload,
  collectOutdatedUnitPaths,
  collectOutdatedVersionDataPaths,
  createLocalizedWorkingContents,
  createLocalizedWorkingVersionData,
  extractContentsTranslationUnits,
  extractVersionDataTranslationUnits,
  isVersionDataLocalizable,
} from '@usertour/helpers';
export { isMediaUrlUnitPath } from '@usertour/helpers';
import { ContentDataType } from '@usertour/types';
import type { ContentEditorRoot, LocalizedFlowContent } from '@usertour/types';

/** The source side of a translation: what the version currently says. */
export interface TranslationSource {
  contentType: string;
  /** Flow only — steps that carry a cvid and a content tree. */
  steps: { cvid: string; data: ContentEditorRoot[] }[];
  /** Non-flow only — `version.data`. */
  data: unknown;
}

/** The stored translation row for one locale (absent until the first save). */
export interface StoredTranslation {
  localized: unknown;
  backup: unknown;
}

export interface TranslationUnitView {
  path: string;
  source: string;
  translation: string;
  optional: boolean;
  outdated: boolean;
}

export interface TranslationStats {
  total: number;
  missing: number;
  outdated: number;
}

const FLOW_PATH_PREFIX = 'steps/';

/** Whether the content type has any translatable text at all (a tracker has no UI). */
export const isContentTypeLocalizable = (contentType: string): boolean =>
  contentType === ContentDataType.FLOW || isVersionDataLocalizable(contentType);

const isNonEmptyObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && Object.keys(value as object).length > 0;

const flowStepPath = (cvid: string, unitPath: string): string =>
  `${FLOW_PATH_PREFIX}${cvid}/${unitPath}`;

const toView = (
  unit: LocalizationTranslationUnit,
  path: string,
  outdated: boolean,
): TranslationUnitView => ({
  path,
  source: unit.sourceText,
  translation: unit.translatedText,
  optional: unit.optional,
  outdated,
});

/**
 * Every translatable unit of the version with its current translation and
 * drift flag. A row that was never saved has no source snapshot, so nothing is
 * outdated — untranslated text is plain "missing".
 */
export const readTranslationUnits = (
  source: TranslationSource,
  stored: StoredTranslation | undefined,
): TranslationUnitView[] => {
  if (source.contentType === ContentDataType.FLOW) {
    const localized = (stored?.localized ?? undefined) as LocalizedFlowContent | undefined;
    const backup = (stored?.backup ?? undefined) as LocalizedFlowContent | undefined;
    return source.steps.flatMap((step) => {
      const working = createLocalizedWorkingContents(step.data, localized?.[step.cvid]);
      const stepBackup = backup?.[step.cvid];
      const outdated = stepBackup
        ? collectOutdatedUnitPaths(step.data, stepBackup, localized?.[step.cvid])
        : new Set<string>();
      return extractContentsTranslationUnits(step.data, working).map((unit) =>
        toView(unit, flowStepPath(step.cvid, unit.path), outdated.has(unit.path)),
      );
    });
  }

  const sourceData = source.data ?? {};
  const working = createLocalizedWorkingVersionData(
    source.contentType,
    sourceData,
    stored?.localized ?? undefined,
  );
  const outdated = isNonEmptyObject(stored?.backup)
    ? collectOutdatedVersionDataPaths(
        source.contentType,
        sourceData,
        stored?.backup,
        stored?.localized ?? undefined,
      )
    : new Set<string>();
  return extractVersionDataTranslationUnits(source.contentType, sourceData, working).map((unit) =>
    toView(unit, unit.path, outdated.has(unit.path)),
  );
};

export const summarizeTranslationUnits = (units: TranslationUnitView[]): TranslationStats => ({
  total: units.length,
  missing: units.filter((unit) => !unit.optional && unit.translation === '').length,
  outdated: units.filter((unit) => unit.outdated).length,
});

/**
 * The payload pair to persist after applying `translations` (unit path → text,
 * or null to clear). Translations land on a working copy of the stored row, the
 * save payload grafts back every stored fragment that copy could not read
 * (removed steps, drifted subtrees), and the source snapshot is refreshed to
 * the current source. Blank values keep the existing translation; callers
 * reject unknown paths beforehand. A swapped embed url loses its resolution
 * data here (it belonged to the previous url) — callers settle the stale embeds
 * of the returned payload before persisting it.
 */
export const applyTranslationUnits = (
  source: TranslationSource,
  stored: StoredTranslation | undefined,
  translations: TranslationUnitChanges,
): { localized: unknown; backup: unknown } => {
  if (source.contentType === ContentDataType.FLOW) {
    const storedLocalized = (stored?.localized ?? undefined) as LocalizedFlowContent | undefined;
    const storedBackup = isNonEmptyObject(stored?.backup)
      ? (stored?.backup as LocalizedFlowContent)
      : undefined;
    const working: LocalizedFlowContent = {};
    for (const step of source.steps) {
      const prefix = flowStepPath(step.cvid, '');
      const stepTranslations = new Map<string, string | null>();
      translations.forEach((value, path) => {
        if (path.startsWith(prefix)) {
          stepTranslations.set(path.slice(prefix.length), value);
        }
      });
      const stepWorking = createLocalizedWorkingContents(step.data, storedLocalized?.[step.cvid]);
      working[step.cvid] =
        stepTranslations.size > 0
          ? applyContentsTranslationUnits(step.data, stepWorking, stepTranslations)
          : stepWorking;
    }
    return {
      localized: buildLocalizedFlowSavePayload(working, storedLocalized),
      backup: buildLocalizedFlowBackup(source.steps, storedBackup),
    };
  }

  const sourceData = source.data ?? {};
  const storedLocalized = stored?.localized ?? undefined;
  const working = createLocalizedWorkingVersionData(
    source.contentType,
    sourceData,
    storedLocalized,
  );
  const next = applyVersionDataTranslationUnits(
    source.contentType,
    sourceData,
    working,
    translations,
  );
  return {
    localized: buildLocalizedVersionDataSavePayload(source.contentType, next, storedLocalized),
    backup: buildLocalizedVersionDataBackup(source.data),
  };
};
