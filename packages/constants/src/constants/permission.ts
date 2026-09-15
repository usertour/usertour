import { Capability, Role } from '@usertour/types';

/**
 * The single source of truth for which capabilities each role holds.
 *
 * Capabilities are grouped into four strictly nested tiers, one per role
 * boundary (VIEWER ⊂ EDITOR ⊂ ADMIN ⊂ OWNER):
 *   - READ        → VIEWER, EDITOR, ADMIN, OWNER   (everyone)
 *   - WRITE       → EDITOR, ADMIN, OWNER           (build, ship, operate)
 *   - ADMIN       → ADMIN, OWNER                   (who gets in, who can log in)
 *   - OWNER_ONLY  → OWNER                          (money, ownership itself)
 *
 * The line between WRITE and ADMIN is drawn by consequence, not by where a
 * feature lives in the UI: anything that only affects the project's own
 * operation (integrations, webhooks, SDK tokens, environments) is WRITE so a
 * builder can finish their work without asking; anything that changes who
 * has access, or costs money, is ADMIN / OWNER.
 *
 * Adding a role is a new row composed from these tiers — no capability or
 * endpoint changes. See ADR 0014.
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
  // Subject to the membership publish whitelist unless the role also holds
  // ContentPublishAnyEnvironment (ADMIN tier).
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
  // Project-internal operations a builder needs to ship and verify content:
  // connect analytics/CRM integrations, wire webhooks, read the SDK token to
  // install, rotate signing secrets.
  Capability.IntegrationRead,
  Capability.IntegrationManage,
  Capability.WebhookRead,
  Capability.WebhookManage,
  Capability.AccessTokenRead,
  Capability.AccessTokenManage,
];

const ADMIN: Capability[] = [Capability.ContentPublishAnyEnvironment];

const OWNER_ONLY: Capability[] = [
  Capability.AuditRead,
  Capability.ProjectManage,
  Capability.BillingRead,
  Capability.BillingManage,
  Capability.TeamRead,
  Capability.TeamManage,
  Capability.SsoRead,
  Capability.SsoManage,
];

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  [Role.VIEWER]: [...READ],
  [Role.EDITOR]: [...READ, ...WRITE],
  [Role.ADMIN]: [...READ, ...WRITE, ...ADMIN],
  [Role.OWNER]: [...READ, ...WRITE, ...ADMIN, ...OWNER_ONLY],
};

/** Whether a role is granted a capability. */
export const roleCan = (role: Role, capability: Capability): boolean =>
  ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
