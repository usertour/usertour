/** A locale to add to a project — what LocalizationsService.create takes. */
export type NewLocalization = {
  projectId: string;
  locale: string;
  name: string;
  code: string;
};
