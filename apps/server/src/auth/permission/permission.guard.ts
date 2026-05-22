import { CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { roleCan } from '@usertour/constants';
import { Role } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { NoPermissionError } from '@/common/errors';
import { ProjectsService } from '@/projects/projects.service';
import { requestContext } from '@/shared/request-context';

import { RequirePermission } from './require-permission.decorator';
import { type ScopeResolver, createScopeResolvers } from './scope-resolver.registry';

/**
 * Single authorization guard, capability-driven.
 *
 * Flow: read `@RequirePermission({ capability, scope })` → resolve the
 * owning projectId from the request (scope resolver, project derived from
 * the resource) → look up the user's membership/role on that project
 * (memoized once per request) → check `roleCan(role, capability)`.
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

    const userProject = await this.resolveUserProject(user.id, projectId);
    if (!userProject || !roleCan(userProject.role as Role, required.capability)) {
      throw new NoPermissionError();
    }

    return true;
  }

  /**
   * Memoize the membership lookup within the request's ALS scope so multiple
   * guarded fields in one request share a single query. Best-effort: admin
   * GraphQL requests aren't ALS-wrapped yet, so fall back to a direct query.
   */
  private resolveUserProject(userId: string, projectId: string) {
    const store = requestContext.getStore();
    if (!store) {
      return this.projectsService.getUserProject(userId, projectId);
    }
    const key = `userProject:${userId}:${projectId}`;
    const cached = store.memo.get(key);
    if (cached) {
      return cached as ReturnType<ProjectsService['getUserProject']>;
    }
    const promise = this.projectsService.getUserProject(userId, projectId);
    store.memo.set(key, promise);
    return promise;
  }
}
