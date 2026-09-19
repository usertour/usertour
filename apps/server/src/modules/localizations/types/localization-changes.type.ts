/** The fields of a locale to change — what LocalizationsService.update takes. */
export type LocalizationChanges = {
  id: string;
  locale?: string;
  name?: string;
  code?: string;
};
