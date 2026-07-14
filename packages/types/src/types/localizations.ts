import type { ContentEditorRoot } from './editor';

/**
 * One entry of the locale picker catalog (@usertour/constants `locates`):
 * the BCP-47 locale tag and the display name the picker renders — also the
 * default name for a localization created from it.
 */
export interface LocaleOption {
  locale: string;
  name: string;
}

export type Localization = {
  id: string;
  projectId: string;
  name: string;
  locale: string;
  code: string;
  createdAt: string;
  isDefault: boolean;
};

/**
 * Flow localization payload: step cvid → structural clone of that step's
 * editor tree. Translatable text fields hold the translation, or an empty
 * string when untranslated; delivery falls back to the source text, so the
 * source version stays the single authority for structure and behavior.
 */
export type LocalizedFlowContent = Record<string, ContentEditorRoot[]>;

/**
 * Non-flow localization payload: structural clone of `version.data`
 * (checklist / launcher / banner / announcement / resource center) under the
 * same discipline — translatable text fields hold the translation or an
 * empty string when untranslated.
 */
export type LocalizedVersionData = Record<string, unknown>;

export type VersionOnLocalization = {
  id: string;
  versionId: string;
  enabled: boolean;
  localizationId: string;
  localized: LocalizedFlowContent | LocalizedVersionData | null;
  backup: LocalizedFlowContent | LocalizedVersionData | null;
  updatedAt: string;
  createdAt: string;
};
