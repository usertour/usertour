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
  apiToken?: { id?: string; userId?: string };
  accessToken?: { id?: string };
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
