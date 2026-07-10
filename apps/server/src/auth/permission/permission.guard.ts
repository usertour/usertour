import { CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { roleCan } from '@usertour/constants';
import { Role } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { MemberEnvironmentNotAllowedError, NoPermissionError } from '@/common/errors';
import { ProjectsService } from '@/projects/projects.service';

import { RequirePermission } from './require-permission.decorator';
import { ScopeKind, type ScopeResolver, createScopeResolvers } from './scope-resolver.registry';

/**
 * Single authorization guard, capability-driven.
 *
 * Flow: read `@RequirePermission({ capability, scope })` → resolve the
 * owning projectId from the request (scope resolver, project derived from
 * the resource) → look up the user's membership/role on that project →
 * check `roleCan(role, capability)`.
 *
 * Replaces the per-module guards. Scope is resolved with generic Prisma
 * lookups so the guard depends only on Prisma + ProjectsService (no
 * per-module service injection, no circular deps). Endpoints migrate from
 * `@UseGuards(XxxGuard) @Roles([...])` to `@UseGuards(PermissionGuard)
 * @RequirePermission(...)` one module at a time in P2.
 */
export class PermissionGuard implements CanActivate {
  private readonly reflector = new Reflector();
  private readonly resolvers: Record<string, ScopeResolver>;

  constructor(
    @Inject(ProjectsService) private readonly projectsService: ProjectsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    this.resolvers = createScopeResolvers({
      getEntityProjectId: async (model, id) =>
        (
          (await (this.prisma as any)[model].findUnique({
            where: { id },
            select: { projectId: true },
          })) as { projectId?: string } | null
        )?.projectId ?? null,
      getEnvironmentProjectId: async (environmentId) =>
        (
          await this.prisma.environment.findUnique({
            where: { id: environmentId },
            select: { projectId: true },
          })
        )?.projectId ?? null,
      getContentProjectId: async (contentId) =>
        (
          await this.prisma.content.findUnique({
            where: { id: contentId },
            select: { projectId: true },
          })
        )?.projectId ?? null,
      getVersionProjectId: async (versionId) =>
        (
          await this.prisma.version.findUnique({
            where: { id: versionId },
            select: { content: { select: { projectId: true } } },
          })
        )?.content?.projectId ?? null,
      getStepProjectId: async (stepId) =>
        (
          await this.prisma.step.findUnique({
            where: { id: stepId },
            select: { version: { select: { content: { select: { projectId: true } } } } },
          })
        )?.version?.content?.projectId ?? null,
      getSessionProjectId: async (sessionId) =>
        (
          await this.prisma.bizSession.findUnique({
            where: { id: sessionId },
            select: { content: { select: { projectId: true } } },
          })
        )?.content?.projectId ?? null,
      getIntegrationEnvironmentId: async (integrationId) =>
        (
          await this.prisma.integration.findUnique({
            where: { id: integrationId },
            select: { environmentId: true },
          })
        )?.environmentId ?? null,
      getMappingEnvironmentId: async (mappingId) =>
        (
          await this.prisma.integrationObjectMapping.findUnique({
            where: { id: mappingId },
            select: { integration: { select: { environmentId: true } } },
          })
        )?.integration?.environmentId ?? null,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get(RequirePermission, context.getHandler());
    if (!required) {
      // No capability declared — this guard does not apply.
      return true;
    }

    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    const args = ctx.getArgs();
    const user = req.user;
    if (!user) {
      throw new NoPermissionError();
    }

    const resolver = this.resolvers[required.scope];
    const projectId = resolver ? await resolver(args) : null;
    if (!projectId) {
      throw new NoPermissionError();
    }
    // Stash for the AuditInterceptor (runs after guards) so web-admin audit
    // doesn't re-resolve the project — see audit.interceptor `interceptWeb`.
    (req as { auditProjectId?: string }).auditProjectId = projectId;

    const userProject = await this.projectsService.getUserProject(user.id, projectId);
    if (!userProject || !roleCan(userProject.role as Role, required.capability)) {
      throw new NoPermissionError();
    }

    // Third permission dimension (mirrors ApiToken.allowedEnvironmentIds): a
    // membership may be restricted to a set of environments. OWNER is exempt —
    // the invariant that owners can never lock themselves out of their project.
    if (userProject.role !== Role.OWNER) {
      const allowed = Array.isArray(userProject.allowedEnvironmentIds)
        ? (userProject.allowedEnvironmentIds as string[])
        : null;
      if (allowed) {
        const targets = await this.resolveTargetEnvironmentIds(required.scope, args);
        if (targets.some((envId) => !allowed.includes(envId))) {
          throw new MemberEnvironmentNotAllowedError();
        }
      }
    }

    return true;
  }

  /**
   * The environment(s) a request ACTS ON, for the membership env check. Explicit
   * environment arguments cover env-scoped endpoints and env-as-parameter writes
   * (publish/unpublish `data.environmentId`);
   * integration / mapping / session endpoints carry their environment implicitly
   * and are resolved through the row. Project-level scopes yield nothing.
   */
  private async resolveTargetEnvironmentIds(
    scope: ScopeKind,
    args: Record<string, any>,
  ): Promise<string[]> {
    const explicit = [args.environmentId, args.data?.environmentId, args.query?.environmentId];
    // Environment-scoped endpoints address the environment row itself as `data.id`.
    if (scope === ScopeKind.Environment) {
      explicit.push(args.data?.id);
    }
    if (scope === ScopeKind.Integration) {
      const integrationId = args.integrationId || args.data?.integrationId;
      const mappingId = args.id || args.data?.id;
      if (integrationId) {
        explicit.push(
          (
            await this.prisma.integration.findUnique({
              where: { id: integrationId },
              select: { environmentId: true },
            })
          )?.environmentId,
        );
      } else if (mappingId) {
        explicit.push(
          (
            await this.prisma.integrationObjectMapping.findUnique({
              where: { id: mappingId },
              select: { integration: { select: { environmentId: true } } },
            })
          )?.integration?.environmentId,
        );
      }
    }
    if (scope === ScopeKind.Session) {
      const sessionId = args.sessionId || args.query?.sessionId || args.data?.sessionId;
      if (sessionId) {
        explicit.push(
          (
            await this.prisma.bizSession.findUnique({
              where: { id: sessionId },
              select: { environmentId: true },
            })
          )?.environmentId,
        );
      }
    }
    // Segment DEFINITIONS are project-level (updateSegment/deleteSegment carry only
    // a segmentId — no env dimension), but segment MEMBERSHIP is environment-scoped:
    // a BizUser/BizCompany belongs to a specific environment. The membership writes
    // (createBizUserOnSegment / deleteBizUserOnSegment + company equivalents) carry
    // only the internal biz ids, so resolve their environments here — else an
    // env-restricted member could add/remove a user from another environment,
    // escaping their ceiling. (The v2 REST/MCP path resolves the env explicitly.)
    if (scope === ScopeKind.Segment) {
      const bizUserIds: string[] = [
        ...((args.data?.userOnSegment as { bizUserId?: string }[] | undefined)?.map(
          (u) => u.bizUserId,
        ) ?? []),
        ...((args.data?.bizUserIds as string[] | undefined) ?? []),
      ].filter((id): id is string => typeof id === 'string' && id !== '');
      const bizCompanyIds: string[] = [
        ...((args.data?.companyOnSegment as { bizCompanyId?: string }[] | undefined)?.map(
          (c) => c.bizCompanyId,
        ) ?? []),
        ...((args.data?.bizCompanyIds as string[] | undefined) ?? []),
      ].filter((id): id is string => typeof id === 'string' && id !== '');
      if (bizUserIds.length) {
        const users = await this.prisma.bizUser.findMany({
          where: { id: { in: bizUserIds } },
          select: { environmentId: true },
        });
        explicit.push(...users.map((u) => u.environmentId));
      }
      if (bizCompanyIds.length) {
        const companies = await this.prisma.bizCompany.findMany({
          where: { id: { in: bizCompanyIds } },
          select: { environmentId: true },
        });
        explicit.push(...companies.map((c) => c.environmentId));
      }
    }
    return [...new Set(explicit.filter((v): v is string => typeof v === 'string' && v !== ''))];
  }
}
