import { Capability, Role } from '@usertour/types';

/**
 * The single source of truth for which capabilities each role holds.
 *
 * Capabilities are grouped into three tiers that mirror the only three
 * role sets in use today:
 *   - READ        → VIEWER, ADMIN, OWNER   (everyone)
 *   - WRITE       → ADMIN, OWNER           (excludes VIEWER)
 *   - OWNER_ONLY  → OWNER                  (team / billing / project admin)
 *
 * Adding a future role (e.g. an Editor between VIEWER and ADMIN) is a new
 * row here composed from these tiers — no capability or endpoint changes.
 */
const READ: Capability[] = [
  Capability.ContentRead,
  Capability.ThemeRead,
  Capability.AttributeRead,
  Capability.EventRead,
  Capability.LocalizationRead,
  Capability.SegmentRead,
  Capability.UserRead,
  Capability.CompanyRead,
  Capability.SessionRead,
  Capability.AnalyticsRead,
  Capability.EnvironmentRead,
  Capability.ProjectRead,
  Capability.ProjectActivate,
];

const WRITE: Capability[] = [
  Capability.ContentCreate,
  Capability.ContentUpdate,
  Capability.ContentPublish,
  Capability.ContentDelete,
  Capability.ThemeCreate,
  Capability.ThemeUpdate,
  Capability.ThemeDelete,
  Capability.AttributeCreate,
  Capability.AttributeUpdate,
  Capability.AttributeDelete,
  Capability.EventCreate,
  Capability.EventUpdate,
  Capability.EventDelete,
  Capability.LocalizationCreate,
  Capability.LocalizationUpdate,
  Capability.LocalizationDelete,
  Capability.SegmentCreate,
  Capability.SegmentUpdate,
  Capability.SegmentDelete,
  Capability.UserWrite,
  Capability.UserDelete,
  Capability.CompanyWrite,
  Capability.CompanyDelete,
  Capability.SessionManage,
  Capability.EnvironmentManage,
];

const OWNER_ONLY: Capability[] = [
  Capability.AuditRead,
  Capability.ProjectManage,
  Capability.BillingRead,
  Capability.BillingManage,
  Capability.TeamRead,
  Capability.TeamManage,
  Capability.IntegrationRead,
  Capability.IntegrationManage,
  Capability.WebhookRead,
  Capability.WebhookManage,
  Capability.AccessTokenRead,
  Capability.AccessTokenManage,
  Capability.SsoRead,
  Capability.SsoManage,
];

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  [Role.VIEWER]: [...READ],
  [Role.ADMIN]: [...READ, ...WRITE],
  [Role.OWNER]: [...READ, ...WRITE, ...OWNER_ONLY],
};

/** Whether a role is granted a capability. */
export const roleCan = (role: Role, capability: Capability): boolean =>
  ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
