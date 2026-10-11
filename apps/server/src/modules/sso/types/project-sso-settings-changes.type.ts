import type { SsoDefaultRole } from './sso-default-role.type';

/** A patch of a project's SSO settings — what SsoService.updateSettings takes. */
export type ProjectSsoSettingsChanges = {
  requireSso?: boolean;
  autoProvision?: boolean;
  defaultRole?: SsoDefaultRole;
  allowedDomains?: string[];
};
