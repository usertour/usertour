import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { PrismaService } from 'nestjs-prisma';
import { type Observable, tap } from 'rxjs';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { Audit, AuditWeb } from './audit.decorator';
import { AuditService } from './audit.service';
import type {
  AuditAction,
  AuditEntry,
  AuditGqlRequest,
  AuditHttpRequest,
  WebAuditMeta,
} from './audit.types';

/**
 * Audits writes through the v2 REST API. Reuses the `@RequireCapability`
 * metadata already on every endpoint (no per-endpoint `@Audit` decorator, no
 * duplication of the MCP tools' audit declarations): the capability encodes
 * resource + verb, and the actor/env/project come from the request the
 * ApiTokenGuard already populated. Read endpoints (e.g. `*:read`) derive to
 * `null` and are skipped. v1 `src/openapi` (env-AccessToken auth, no
 * capabilities) is covered via explicit `@Audit` decorators on its write
 * endpoints — and an explicit `@Audit` also overrides the capability derivation
 * on v2 routes where the capability is the wrong descriptor (membership routes);
 * web-admin GraphQL via explicit `@AuditWeb` on lifecycle mutations.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const handler = context.getHandler();
    const contextType = context.getType<GqlContextType>();
    if (contextType === 'graphql') {
      return this.interceptWeb(context, next);
    }
    if (contextType !== 'http') {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest<AuditHttpRequest>();

    // v2 endpoints derive from @RequireCapability; v1 endpoints carry explicit @Audit.
    // An explicit @Audit WINS over the derivation — a v2 route uses it when the
    // capability's resource/action is the wrong audit descriptor (e.g. membership
    // routes under `company:write`, which must record the MEMBER, not the company).
    const capability = this.reflector.get<string>(RequireCapability, handler);
    const explicit = this.reflector.get(Audit, handler);
    let resourceType: string;
    let action: AuditAction;
    let resourceId: (r: AuditHttpRequest, result: unknown) => string = (r, result) =>
      resolveResourceId(r.params, result, action);
    if (explicit) {
      resourceType = explicit.resourceType;
      action = explicit.action;
      if (explicit.resourceId) {
        resourceId = explicit.resourceId;
      }
    } else if (capability) {
      const derived = deriveAudit(String(capability), req.method, !!req.params?.id);
      if (!derived) {
        return next.handle();
      }
      ({ resourceType, action } = derived);
    } else {
      return next.handle();
    }

    const environmentId = req.environment?.id ?? bodyEnvironmentId(capability, req.body);
    let before: unknown;
    try {
      before = await fetchBefore(resourceType, action, req.params, environmentId, this.prisma);
    } catch (error) {
      this.logger.error('Audit before-fetch failed', error as Error);
    }

    return next.handle().pipe(
      tap((result) => {
        this.audit.record(
          buildRestAuditEntry(
            req,
            { action, resourceType, resourceId: resourceId(req, result), environmentId },
            before,
            result,
          ),
        );
      }),
    );
  }

  /**
   * Web-admin GraphQL writes. Selective: only mutations carrying `@AuditWeb` are
   * recorded (source='web', actor = logged-in user).
   *
   * Project attribution has two sources, and their PRECEDENCE matters. An
   * account-level mutation (createApiToken / rotate / delete — no
   * `@RequirePermission`) carries its own `resolveProjectId`, and that is
   * authoritative: it knows the credential's real project set. The
   * PermissionGuard stash (`req.auditProjectId`) is a fallback for the common
   * resource mutation that has no resolver. It must NOT win over a resolver,
   * because `req` is shared across every field of one GraphQL document: a
   * guarded field (e.g. updateContent on project P1) executed before an
   * unguarded createApiToken(projectIds:[P2]) in the SAME document would
   * otherwise bleed P1 onto the token entry, hiding it from P2's owners.
   */
  private async interceptWeb(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const handler = context.getHandler();
    const meta = this.reflector.get(AuditWeb, handler);
    if (!meta) {
      return next.handle();
    }
    const gqlCtx = GqlExecutionContext.create(context);
    const req = gqlCtx.getContext()?.req as AuditGqlRequest | undefined;
    const args = (gqlCtx.getArgs() ?? {}) as Record<string, unknown>;
    const projectIds = await resolveWebAuditProjectIds(
      meta,
      args,
      req?.auditProjectId,
      this.prisma,
      (error) => this.logger.error('Audit(web): resolveProjectId failed', error),
    );
    if (projectIds.length === 0) {
      // Audited web mutations must be either @RequirePermission-guarded (guard
      // stashes projectId) or carry a resolveProjectId. Surface the wiring bug;
      // don't crash.
      this.logger.error(
        `Audit(web): no projectId for ${meta.resourceType}:${meta.action} — missing @RequirePermission / resolveProjectId?`,
      );
      return next.handle();
    }

    const environmentId = meta.environmentId?.(args) ?? null;
    let before: unknown;
    try {
      // The before-snapshot id comes from the args (delete/update). resourceId
      // fns that need the result (create/publish) throw on the undefined result —
      // treat that as "no before" (those policies don't snapshot anyway).
      let beforeId: string | undefined;
      if (meta.action !== 'create') {
        try {
          const id = meta.resourceId
            ? meta.resourceId(args, undefined)
            : resolveResourceId(args, undefined, meta.action);
          beforeId = id || undefined;
        } catch {
          beforeId = undefined;
        }
      }
      before = await fetchBefore(
        meta.resourceType,
        meta.action,
        { id: beforeId },
        environmentId,
        this.prisma,
      );
    } catch (error) {
      this.logger.error('Audit before-fetch failed', error as Error);
    }
    const operation = gqlCtx.getInfo()?.fieldName ?? handler.name;

    return next.handle().pipe(
      tap((result) => {
        // Second evaluation, now with the result: update/delete/rotate args
        // only carry an id, but the returned row knows its environment.
        const resolvedEnvironmentId = meta.environmentId?.(args, result) ?? environmentId;
        for (const projectId of projectIds) {
          this.audit.record(
            buildWebAuditEntry(req, args, result, meta, {
              projectId,
              environmentId: resolvedEnvironmentId,
              operation,
              before,
            }),
          );
        }
      }),
    );
  }
}

/** Map a completed web-admin GraphQL write into an `AuditEntry` (mirror of buildRestAuditEntry). */
export function buildWebAuditEntry(
  req: AuditGqlRequest | undefined,
  args: Record<string, unknown>,
  result: unknown,
  meta: WebAuditMeta,
  ctx: { projectId: string; environmentId: string | null; operation: string; before: unknown },
): AuditEntry {
  const userAgent = req?.headers?.['user-agent'];
  return {
    source: 'web',
    projectId: ctx.projectId,
    environmentId: ctx.environmentId,
    actorUserId: req?.user?.id ?? null,
    actorTokenId: null,
    action: meta.action,
    operation: ctx.operation,
    resourceType: meta.resourceType,
    resourceId: meta.resourceId
      ? meta.resourceId(args, result)
      : resolveResourceId(args, result, meta.action),
    before: ctx.before,
    after: meta.capture ? meta.capture(args, result) : result,
    metadata: {
      credentialType: 'session',
      ip: req?.ip,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    },
  };
}

/**
 * Map a completed REST write into an `AuditEntry`. Pure: keeps the field mapping
 * out of the interceptor's `tap` (mirror of MCP's `buildMcpAuditEntry`).
 */
export function buildRestAuditEntry(
  req: AuditHttpRequest,
  descriptor: {
    action: AuditAction;
    resourceType: string;
    resourceId: string;
    environmentId: string | null;
  },
  before: unknown,
  result: unknown,
): AuditEntry {
  const credentialType = req.apiToken ? 'apiToken' : req.accessToken ? 'accessToken' : undefined;
  // Capture the credential's display name AT WRITE TIME: short-lived OAuth token
  // rows are hard-deleted by the expiry cleanup, so a read-time lookup goes blank
  // within the hour — the stored name keeps the entry attributable forever.
  const tokenName = req.apiToken?.name ?? req.accessToken?.name ?? undefined;
  return {
    source: 'api',
    projectId:
      req.projectId ?? (req.params?.projectId as string) ?? req.environment?.projectId ?? '',
    environmentId: descriptor.environmentId,
    actorUserId: req.apiToken?.userId ?? null,
    actorTokenId: req.apiToken?.id ?? req.accessToken?.id ?? null,
    action: descriptor.action,
    operation: `${req.method} ${req.route?.path ?? ''}`.trim(),
    resourceType: descriptor.resourceType,
    resourceId: descriptor.resourceId,
    before,
    after: result,
    metadata: credentialType ? { credentialType, ...(tokenName ? { tokenName } : {}) } : undefined,
  };
}

/**
 * The audit entry's environmentId when the guard set no `req.environment` (only
 * `:environmentId` path routes get one). ONLY publish-verb routes (publish /
 * unpublish) legitimately carry the target env in the body, and their controllers
 * validate it against the token's environment fence. Everywhere else `req.body`
 * is UNVALIDATED at this point — interceptors run before the zod pipes, and
 * body-less routes (DELETE / restore / end) never run them at all — so a stray
 * `environmentId` key would pollute the entry's attribution verbatim. Ignore it.
 */
export function bodyEnvironmentId(
  capability: string | undefined,
  body: Record<string, unknown> | undefined,
): string | null {
  if (!capability?.endsWith(':publish')) {
    return null;
  }
  return typeof body?.environmentId === 'string' ? body.environmentId : null;
}

/** capability prefix → audit resourceType. Absent (read/localization/project/...) → not audited. */
const RESOURCE_BY_PREFIX: Record<string, string> = {
  content: 'content',
  theme: 'theme',
  attribute: 'attribute',
  event: 'event',
  segment: 'segment',
  user: 'user',
  company: 'company',
  session: 'session',
  environment: 'environment',
  webhook: 'webhook',
};

/** A resolveProjectId result (single / array / absent) normalized to a clean id list. */
export function normalizeProjectIds(resolved: string | string[] | null | undefined): string[] {
  // Dedupe: a resolver may hand back the raw input array (createApiToken's
  // projectIds), and the interceptor writes ONE audit row per id — a repeated id
  // would log the same event twice for a single write.
  return [
    ...new Set(
      (Array.isArray(resolved) ? resolved : resolved ? [resolved] : []).filter(
        (id): id is string => !!id,
      ),
    ),
  ];
}

/**
 * The project(s) a `@AuditWeb` entry is attributed to. Precedence matters:
 * `meta.resolveProjectId` (account-level mutations — API keys / OAuth grants)
 * is AUTHORITATIVE and wins over the PermissionGuard's `stashedProjectId`,
 * because `req.auditProjectId` is shared across every field of one GraphQL
 * document — an earlier guarded field (updateContent on P1) must not bleed its
 * project onto an unguarded createApiToken(projectIds:[P2]) in the same
 * document. The stash is only the source for resource mutations that carry no
 * resolver (they ran their own guard for THIS field).
 */
export async function resolveWebAuditProjectIds(
  meta: Pick<WebAuditMeta, 'resolveProjectId'>,
  args: Record<string, unknown>,
  stashedProjectId: string | undefined,
  prisma: PrismaService,
  onError?: (error: Error) => void,
): Promise<string[]> {
  if (meta.resolveProjectId) {
    try {
      const resolved = normalizeProjectIds(await meta.resolveProjectId(args, prisma));
      if (resolved.length > 0) {
        return resolved;
      }
    } catch (error) {
      onError?.(error as Error);
      // A declared resolver that THREW must not fall back to the stash: the
      // stash may belong to a different field of the same document — even one
      // the actor was denied on. A dropped entry misleads less than one
      // attributed to the wrong project; the caller logs the drop loudly.
      return [];
    }
    // Resolved to nothing (e.g. the row is already gone): the stash fallback
    // below is intentional for that benign case.
  }
  return stashedProjectId ? [stashedProjectId] : [];
}

/** Derive {resourceType, action} from `resource:verb` + HTTP method (for the ambiguous `manage`). */
export function deriveAudit(
  capability: string,
  httpMethod: string,
  hasPathId = false,
): { resourceType: string; action: AuditAction } | null {
  const [prefix, verb] = capability.split(':');
  const resourceType = RESOURCE_BY_PREFIX[prefix];
  if (!resourceType) {
    return null;
  }
  let action: AuditAction | null = null;
  switch (verb) {
    case 'create':
      action = 'create';
      break;
    case 'update':
    case 'publish':
    case 'write': // upsert
      action = 'update';
      break;
    case 'delete':
      action = 'delete';
      break;
    case 'manage':
      // A POST with a path id is an action on an EXISTING resource
      // (POST /:id/rotate-secret, POST /:id/end) — an update, not a create.
      // hasPathId fully generalizes the old resourceType-specific carve-outs:
      // every action-shaped POST carries a path id, and no resource has an
      // id-less POST that isn't a create.
      action =
        httpMethod === 'DELETE'
          ? 'delete'
          : httpMethod === 'POST' && !hasPathId
            ? 'create'
            : 'update';
      break;
    default: // 'read' and anything else → not audited
      return null;
  }
  return { resourceType, action };
}

export function resolveResourceId(
  params: Record<string, unknown> | undefined,
  result: unknown,
  action?: AuditAction,
): string {
  const resultId = (result as { id?: unknown } | undefined)?.id;
  // A `create` names the NEWLY-created resource, which lives in the result — not
  // in a path param. The only create route carrying a path id is
  // POST /:id/duplicate, where params.id is the SOURCE; attributing the copy's
  // create event to the source would be wrong. update/delete keep params first
  // (the action targets the resource named in the path).
  if (action === 'create' && resultId != null) {
    return String(resultId);
  }
  // `contentId` outranks `id`: on the version routes (PATCH|POST
  // /content/:contentId/versions/:id) the audited resource is the CONTENT
  // (resourceType 'content'), and MCP/web record the content id for the same
  // operations — a version id here would split the per-content history across
  // two id spaces. No other route carries both params.
  return String(params?.contentId ?? params?.id ?? params?.externalId ?? resultId ?? '');
}

/** before-snapshot for delete/update on a single resource; redaction is applied later in AuditService. */
export async function fetchBefore(
  resourceType: string,
  action: AuditAction,
  params: Record<string, unknown> | undefined,
  environmentId: string | null,
  prisma: PrismaService,
): Promise<unknown> {
  if (action === 'create') {
    return undefined;
  }
  // Same precedence as resolveResourceId: the before-row must be the resource the
  // entry names (only the content-version routes carry both, and hit `default`).
  const id = params?.contentId ?? params?.id;
  if (!id) {
    return undefined;
  }
  switch (resourceType) {
    case 'segment':
      return prisma.segment.findUnique({ where: { id: String(id) } });
    case 'theme':
      return prisma.theme.findUnique({ where: { id: String(id) } });
    case 'attribute':
      return prisma.attribute.findUnique({ where: { id: String(id) } });
    case 'event':
      return prisma.event.findUnique({ where: { id: String(id) } });
    case 'session':
      return prisma.bizSession.findUnique({ where: { id: String(id) } });
    case 'user':
      // REST/MCP address users by EXTERNAL id (+ environment); the web-admin
      // delete metas pass internal BizUser ids. Try external first, then fall
      // back to the primary key so the irreversible web delete still captures
      // its before snapshot instead of silently recording none.
      return (
        (environmentId
          ? await prisma.bizUser.findFirst({ where: { externalId: String(id), environmentId } })
          : null) ?? prisma.bizUser.findUnique({ where: { id: String(id) } })
      );
    case 'company':
      return (
        (environmentId
          ? await prisma.bizCompany.findFirst({ where: { externalId: String(id), environmentId } })
          : null) ?? prisma.bizCompany.findUnique({ where: { id: String(id) } })
      );
    case 'api_token':
      return prisma.apiToken.findUnique({ where: { id: String(id) } });
    case 'access_token':
      return prisma.accessToken.findUnique({ where: { id: String(id) } });
    case 'signing_secret':
      return prisma.environmentSigningSecret.findUnique({ where: { id: String(id) } });
    case 'integration':
      return prisma.integration.findUnique({ where: { id: String(id) } });
    case 'oauth_grant':
      return prisma.oAuthGrant.findUnique({ where: { id: String(id) } });
    case 'sso_provider':
      return prisma.projectSSOIdentityProvider.findUnique({ where: { id: String(id) } });
    case 'webhook':
      return prisma.webhook.findUnique({ where: { id: String(id) } });
    case 'environment':
      return prisma.environment.findUnique({ where: { id: String(id) } });
    case 'project':
      return prisma.project.findUnique({ where: { id: String(id) } });
    default: // content → snapshot policy is 'none' anyway
      return undefined;
  }
}
