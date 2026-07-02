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
 * endpoints; web-admin GraphQL via explicit `@AuditWeb` on lifecycle mutations.
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
    const capability = this.reflector.get<string>(RequireCapability, handler);
    const explicit = this.reflector.get(Audit, handler);
    let resourceType: string;
    let action: AuditAction;
    let resourceId: (r: AuditHttpRequest, result: unknown) => string = (r, result) =>
      resolveResourceId(r.params, result);
    if (capability) {
      const derived = deriveAudit(String(capability), req.method);
      if (!derived) {
        return next.handle();
      }
      ({ resourceType, action } = derived);
    } else if (explicit) {
      resourceType = explicit.resourceType;
      action = explicit.action;
      if (explicit.resourceId) {
        resourceId = explicit.resourceId;
      }
    } else {
      return next.handle();
    }

    const environmentId = req.environment?.id ?? null;
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
   * recorded (source='web', actor = logged-in user). projectId is reused from the
   * PermissionGuard (it ran first and stashed `req.auditProjectId`).
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
    let projectId = req?.auditProjectId;
    if (!projectId && meta.resolveProjectId) {
      // Account-level mutation: attribute the entry to the resource's own project.
      try {
        projectId = (await meta.resolveProjectId(args, this.prisma)) ?? undefined;
      } catch (error) {
        this.logger.error('Audit(web): resolveProjectId failed', error as Error);
      }
    }
    if (!projectId) {
      // Audited web mutations must also be @RequirePermission-guarded (the guard
      // resolves + stashes projectId). Surface the wiring bug; don't crash.
      this.logger.error(
        `Audit(web): no projectId for ${meta.resourceType}:${meta.action} — missing @RequirePermission?`,
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
            : resolveResourceId(args, undefined);
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
        this.audit.record(
          buildWebAuditEntry(req, args, result, meta, {
            projectId,
            environmentId,
            operation,
            before,
          }),
        );
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
    resourceId: meta.resourceId ? meta.resourceId(args, result) : resolveResourceId(args, result),
    before: ctx.before,
    after: result,
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
    metadata: credentialType ? { credentialType } : undefined,
  };
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
};

/** Derive {resourceType, action} from `resource:verb` + HTTP method (for the ambiguous `manage`). */
export function deriveAudit(
  capability: string,
  httpMethod: string,
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
      action =
        httpMethod === 'DELETE'
          ? 'delete'
          : httpMethod === 'POST' && resourceType !== 'session'
            ? 'create'
            : 'update';
      break;
    default: // 'read' and anything else → not audited
      return null;
  }
  return { resourceType, action };
}

function resolveResourceId(params: Record<string, unknown> | undefined, result: unknown): string {
  return String(
    params?.id ??
      params?.contentId ??
      params?.externalId ??
      (result as { id?: unknown } | undefined)?.id ??
      '',
  );
}

/** before-snapshot for delete/update on a single resource; redaction is applied later in AuditService. */
async function fetchBefore(
  resourceType: string,
  action: AuditAction,
  params: Record<string, unknown> | undefined,
  environmentId: string | null,
  prisma: PrismaService,
): Promise<unknown> {
  if (action === 'create') {
    return undefined;
  }
  const id = params?.id ?? params?.contentId;
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
      return environmentId
        ? prisma.bizUser.findFirst({ where: { externalId: String(id), environmentId } })
        : undefined;
    case 'company':
      return environmentId
        ? prisma.bizCompany.findFirst({ where: { externalId: String(id), environmentId } })
        : undefined;
    case 'api_token':
      return prisma.apiToken.findUnique({ where: { id: String(id) } });
    case 'access_token':
      return prisma.accessToken.findUnique({ where: { id: String(id) } });
    case 'oauth_grant':
      return prisma.oAuthGrant.findUnique({ where: { id: String(id) } });
    case 'sso_provider':
      return prisma.projectSSOIdentityProvider.findUnique({ where: { id: String(id) } });
    default: // content/environment → snapshot policy is 'none' anyway
      return undefined;
  }
}
