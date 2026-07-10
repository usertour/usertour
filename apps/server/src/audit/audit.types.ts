import type { PrismaService } from 'nestjs-prisma';

/**
 * Domain event emitted on every audited mutation through the open write surface
 * (v2 API + MCP). Audit is its first subscriber; future consumers (webhooks,
 * integrations, notifications) can subscribe to the same event — that fan-out is
 * why this goes through the event emitter rather than enqueuing directly.
 */
export const RESOURCE_CHANGED_EVENT = 'resource.changed';

export type AuditSource = 'api' | 'mcp' | 'web' | 'system';
export type AuditAction = 'create' | 'update' | 'delete';

/**
 * One audited change. `before`/`after` are already redacted per the resource's
 * snapshot policy by the time they reach the listener (so no consumer ever sees
 * PII). The actor must be identifiable unless `source === 'system'`.
 */
export interface AuditEntry {
  projectId: string;
  environmentId?: string | null;
  source: AuditSource;
  actorUserId?: string | null;
  actorTokenId?: string | null;
  action: AuditAction;
  /** Exact tool / route, e.g. `delete_segment`. */
  operation: string;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown> | null;
}

/** Minimal shape of the HTTP request the AuditInterceptor reads off. */
export interface AuditHttpRequest {
  method: string;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  route?: { path?: string };
  projectId?: string;
  environment?: { id?: string; projectId?: string };
  apiToken?: { id?: string; userId?: string; name?: string };
  accessToken?: { id?: string; name?: string };
}

/**
 * Explicit audit metadata for write endpoints that don't carry
 * `@RequireCapability` (the v1 `src/openapi` REST surface). v2 endpoints derive
 * their descriptor from the capability instead.
 */
export interface ExplicitAuditMeta {
  action: AuditAction;
  resourceType: string;
  /** Override id resolution (default: params.id ?? params.contentId ?? params.externalId ?? result.id). */
  resourceId?: (req: AuditHttpRequest, result: unknown) => string;
}

/** Minimal shape of the GraphQL request the AuditInterceptor reads off (web admin). */
export interface AuditGqlRequest {
  user?: { id?: string };
  ip?: string;
  headers?: Record<string, unknown>;
  /** projectId resolved + stashed by PermissionGuard (guards run before interceptors). */
  auditProjectId?: string;
}

/**
 * Explicit audit metadata for web-admin GraphQL mutations (`source='web'`, actor
 * is the logged-in user, no token). Selective opt-in: only meaningful lifecycle /
 * config mutations carry it — builder draft saves are deliberately NOT audited
 * (version history already covers content body).
 */
export interface WebAuditMeta {
  action: AuditAction;
  resourceType: string;
  /** id from the mutation args / result. Default: args.id ?? args.contentId ?? result.id. */
  resourceId?: (args: Record<string, unknown>, result: unknown) => string;
  /** env-scoped resources: extract environmentId from args (default: none → null). */
  environmentId?: (args: Record<string, unknown>) => string | undefined | null;
  /**
   * ACCOUNT-level mutations (no `@RequirePermission` project context — personal
   * API keys, connected-app grants): resolve the project to attribute the entry
   * to, e.g. the key's own project. Used only when the permission guard didn't
   * stash `auditProjectId`.
   */
  resolveProjectId?: (
    args: Record<string, unknown>,
    prisma: PrismaService,
  ) => Promise<string | string[] | null | undefined>;
  /**
   * Override for the `after` snapshot. For BULK mutations (array args) the result
   * is just a count — the audit-worthy facts (which ids, how many) live in the
   * args; capture them explicitly. One mutation call = one entry (the call IS the
   * user's action). Output still passes through snapshot redaction.
   */
  capture?: (args: Record<string, unknown>, result: unknown) => unknown;
}
