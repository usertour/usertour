/**
 * The fields of a token to change — what ApiTokenService.updateToken takes.
 * `environmentIds` is three-state: absent = untouched, null = clear, array =
 * replace the allowlist.
 */
export type ApiTokenChanges = {
  name?: string;
  projectIds?: string[];
  scopes?: string[];
  environmentIds?: string[] | null;
};
