/** The fields of an environment to change — what EnvironmentsService.update takes. */
export type EnvironmentChanges = {
  id: string;
  name: string;
  isPrimary?: boolean;
};
