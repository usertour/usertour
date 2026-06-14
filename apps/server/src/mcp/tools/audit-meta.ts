import type { AuditEntry } from '@/audit/audit.types';
import type { AuditCapture, McpTool, McpToolContext } from '@/mcp/mcp.types';

/**
 * Small factories for the co-located `audit` metadata on write tools. The
 * bespoke `before` fetch is passed inline at the call site so it typechecks
 * against the real Prisma delegates (resource id args and lookup keys differ
 * per resource — that variance is exactly why this lives next to each tool).
 */

type FetchBefore = NonNullable<AuditCapture['fetchBefore']>;
type Options = { envScoped?: boolean; idArg?: string };

/** create_ and duplicate_ tools: id comes from the handler result (defaults to `result.id`). */
export function auditCreate(
  resourceType: string,
  opts?: { envScoped?: boolean; getId?: (result: unknown) => string },
): AuditCapture {
  const getId = opts?.getId ?? ((r: unknown) => String((r as { id?: unknown })?.id ?? ''));
  return {
    action: 'create',
    resourceType,
    envScoped: opts?.envScoped,
    resourceId: (_args, result) => getId(result),
  };
}

/** update_*: id from args; optional `before` snapshot. */
export function auditUpdate(
  resourceType: string,
  fetchBefore?: FetchBefore,
  opts?: Options,
): AuditCapture {
  const idArg = opts?.idArg ?? 'id';
  return {
    action: 'update',
    resourceType,
    envScoped: opts?.envScoped,
    resourceId: (args) => String(args[idArg]),
    fetchBefore,
  };
}

/** delete_ and remove_ tools: id from args; optional `before` snapshot (the recovery source for hard deletes). */
export function auditDelete(
  resourceType: string,
  fetchBefore?: FetchBefore,
  opts?: Options,
): AuditCapture {
  const idArg = opts?.idArg ?? 'id';
  return {
    action: 'delete',
    resourceType,
    envScoped: opts?.envScoped,
    resourceId: (args) => String(args[idArg]),
    fetchBefore,
  };
}

/**
 * Map a completed MCP write into an `AuditEntry`. Pure: keeps the field mapping
 * out of the dispatch wrapper so `runWithAudit` reads as orchestration only.
 */
export function buildMcpAuditEntry(
  tool: McpTool,
  ctx: McpToolContext,
  args: Record<string, unknown>,
  result: unknown,
  before: unknown,
  environment: { id: string } | undefined,
): AuditEntry {
  const meta = tool.audit;
  if (!meta) {
    throw new Error(`buildMcpAuditEntry: tool '${tool.name}' has no audit metadata`);
  }
  return {
    source: 'mcp',
    projectId: ctx.projectId,
    environmentId: environment?.id ?? null,
    actorUserId: ctx.token.userId ?? null,
    actorTokenId: ctx.token.id ?? null,
    action: meta.action,
    operation: tool.name,
    resourceType: meta.resourceType,
    resourceId: meta.resourceId(args, result),
    before,
    after: result,
  };
}
