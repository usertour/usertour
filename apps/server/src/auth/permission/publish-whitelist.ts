/**
 * `UserOnProject.allowedEnvironmentIds` (JSONB) read as the EDITOR publish
 * whitelist. A missing or non-array value is an EMPTY whitelist — the member
 * may publish nowhere — never "all environments": the column is only ever
 * consulted for roles without ContentPublishAnyEnvironment, and a role that
 * publishes everywhere says so through that capability, not through a null
 * here.
 */
export const publishWhitelistOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
