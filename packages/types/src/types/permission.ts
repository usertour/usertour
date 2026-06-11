/**
 * Canonical role for project membership. Values match the persisted
 * `Role` enum in the server's Prisma schema and the frontend
 * `TeamMemberRole`; those three definitions are consolidated onto this
 * one in a later phase. `USER` is intentionally absent — it is unused in
 * memberships and is removed during consolidation.
 */
export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

/**
 * Fine-grained, project-scoped capability expressed as `resource:action`.
 *
 * Capabilities are deliberately finer than the three roles: each role maps
 * to a set of capabilities via `ROLE_CAPABILITIES` (in @usertour/constants).
 * Keeping them fine means a future role (e.g. an Editor that can edit but
 * not publish/delete) is just a new row in that matrix — no new capability
 * and no endpoint change.
 *
 * The capability assigned to each existing endpoint is recorded in the
 * server's endpoint→capability map; the role set granting a capability
 * always matches that endpoint's current `@Roles` list (asserted by the
 * snapshot baseline test).
 */
export enum Capability {
  // content
  ContentRead = 'content:read',
  ContentCreate = 'content:create',
  ContentUpdate = 'content:update',
  ContentPublish = 'content:publish',
  ContentDelete = 'content:delete',
  // theme
  ThemeRead = 'theme:read',
  ThemeCreate = 'theme:create',
  ThemeUpdate = 'theme:update',
  ThemeDelete = 'theme:delete',
  // attribute
  AttributeRead = 'attribute:read',
  AttributeCreate = 'attribute:create',
  AttributeUpdate = 'attribute:update',
  AttributeDelete = 'attribute:delete',
  // event
  EventRead = 'event:read',
  EventCreate = 'event:create',
  EventUpdate = 'event:update',
  EventDelete = 'event:delete',
  // localization
  LocalizationRead = 'localization:read',
  LocalizationCreate = 'localization:create',
  LocalizationUpdate = 'localization:update',
  LocalizationDelete = 'localization:delete',
  // segment
  SegmentRead = 'segment:read',
  SegmentCreate = 'segment:create',
  SegmentUpdate = 'segment:update',
  SegmentDelete = 'segment:delete',
  // end users (the tracked business users your product onboards)
  UserRead = 'user:read',
  UserWrite = 'user:write',
  UserDelete = 'user:delete',
  // companies
  CompanyRead = 'company:read',
  CompanyWrite = 'company:write',
  CompanyDelete = 'company:delete',
  // content sessions
  SessionRead = 'session:read',
  SessionManage = 'session:manage',
  // analytics
  AnalyticsRead = 'analytics:read',
  // environment
  EnvironmentRead = 'environment:read',
  EnvironmentManage = 'environment:manage',
  // access token (environment-scoped API keys)
  AccessTokenRead = 'accesstoken:read',
  AccessTokenManage = 'accesstoken:manage',
  // integration
  IntegrationRead = 'integration:read',
  IntegrationManage = 'integration:manage',
  // project
  ProjectRead = 'project:read',
  ProjectActivate = 'project:activate',
  ProjectManage = 'project:manage',
  // billing / license
  BillingRead = 'billing:read',
  BillingManage = 'billing:manage',
  // team
  TeamRead = 'team:read',
  TeamManage = 'team:manage',
}
