import type { Role } from '@prisma/client';

/** A patch of a project's SSO settings — what SsoService.updateSettings takes. */
export type ProjectSsoSettingsChanges = {
  requireSso?: boolean;
  autoProvision?: boolean;
  defaultRole?: Role;
  allowedDomains?: string[];
};
