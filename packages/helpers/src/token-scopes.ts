import { Capability } from '@usertour/types';

/**
 * Capabilities that ACT ON a specific environment. A credential granting any of
 * them must NAME the environments it may act on — "all environments" is not
 * grantable for env-targeted scopes (fail-open credentials for the exact
 * surfaces that touch end-user data). Enforced SERVER-side at every credential
 * write (personal-key create/update, OAuth consent); the web token form and the
 * consent page apply the same rule client-side for early feedback.
 *
 * Reads of env-scoped entities count (a token reads a SPECIFIC environment's
 * users/sessions/analytics); content is env-targeted only at publish. Project-
 * level resources (themes / attributes / events / environment-settings, and
 * content read/create/update) are NOT here — a credential holding only those
 * never consults its environment list (its allowlist column stays null =
 * "not applicable").
 */
export const ENV_TARGETED_CAPABILITIES: ReadonlySet<string> = new Set<string>([
  Capability.ContentPublish,
  Capability.UserRead,
  Capability.UserWrite,
  Capability.UserDelete,
  Capability.CompanyRead,
  Capability.CompanyWrite,
  Capability.CompanyDelete,
  Capability.SessionRead,
  Capability.SessionManage,
  Capability.SegmentRead,
  Capability.SegmentCreate,
  Capability.SegmentUpdate,
  Capability.SegmentDelete,
  Capability.AnalyticsRead,
]);

/** Whether the given scopes act on specific environments (→ an environment selection is required). */
export const requiresEnvironmentScope = (scopes: string[]): boolean =>
  scopes.some((s) => ENV_TARGETED_CAPABILITIES.has(s));
