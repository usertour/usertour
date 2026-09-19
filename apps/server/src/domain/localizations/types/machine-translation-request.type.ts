/** Units of one version to translate into one locale — what MachineTranslationService takes. */
export type MachineTranslationRequest = {
  versionId: string;
  localizationId: string;
  units: { path: string; sourceText: string }[];
};
