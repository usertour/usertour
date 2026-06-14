import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'nestjs-prisma';
import { type Observable, tap } from 'rxjs';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { Audit } from './audit.decorator';
import { AuditService } from './audit.service';
import type { AuditAction, AuditEntry, AuditHttpRequest } from './audit.types';

/**
 * Audits writes through the v2 REST API. Reuses the `@RequireCapability`
 * metadata already on every endpoint (no per-endpoint `@Audit` decorator, no
 * duplication of the MCP tools' audit declarations): the capability encodes
 * resource + verb, and the actor/env/project come from the request the
 * ApiTokenGuard already populated. Read endpoints (e.g. `*:read`) derive to
 * `null` and are skipped. (v1 `src/openapi` uses a different guard and is not
 * covered here — a separate, small follow-up.)
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
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const handler = context.getHandler();
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
    default: // content/environment → snapshot policy is 'none' anyway
      return undefined;
  }
}
