import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { roleCan } from '@usertour/constants';
import { Capability, Role } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import {
  EnvironmentProjectMismatchError,
  ExpiredApiKeyError,
  InsufficientScopeError,
  InvalidApiKeyError,
  MissingApiKeyError,
  ProjectNotInTokenScopeError,
} from '@/common/errors';

import { API_TOKEN_PREFIX, hashApiTokenSecret } from './api-token.crypto';
import { RequireCapability } from './require-capability.decorator';

/**
 * Authorizes a request bearing an ApiToken (`ut_…`) against a project-rooted
 * v2 route.
 *
 * Flow: extract bearer → hash-lookup the token → active + not-expired →
 * resolve `:projectId` from the path and assert it is in the token's project
 * scope → resolve the owner's live role on that project (UserOnProject) →
 * require capability ∈ `ROLE_CAPABILITIES[role] ∩ token.scopes` → for
 * env-rooted routes, load `:environmentId` and assert it belongs to the
 * project. Attaches `request.environment` (env routes) and `request.apiToken`
 * for downstream handlers, mirroring the env-key guard's contract.
 */
@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const raw = this.extractBearer(request);
    if (!raw) {
      throw new MissingApiKeyError();
    }
    if (!raw.startsWith(API_TOKEN_PREFIX)) {
      throw new InvalidApiKeyError();
    }
    const secret = raw.slice(API_TOKEN_PREFIX.length);

    const token = await this.prisma.apiToken.findUnique({
      where: { hashedSecret: hashApiTokenSecret(secret) },
      include: { projects: { select: { projectId: true } } },
    });
    if (!token || !token.isActive) {
      throw new InvalidApiKeyError();
    }
    if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) {
      throw new ExpiredApiKeyError();
    }

    // v2 routes are project-rooted; project is always in the path.
    const projectId = request.params?.projectId as string | undefined;
    if (!projectId) {
      throw new InvalidApiKeyError();
    }
    const allowedProjectIds = token.projects.map((p) => p.projectId);
    if (!allowedProjectIds.includes(projectId)) {
      throw new ProjectNotInTokenScopeError();
    }

    // Live role on this project — a removed/downgraded owner loses access now.
    const membership = await this.prisma.userOnProject.findFirst({
      where: { userId: token.userId, projectId },
    });
    if (!membership) {
      throw new ProjectNotInTokenScopeError();
    }

    // capability ∈ ROLE_CAPABILITIES[role] ∩ token.scopes
    const required = this.reflector.get(RequireCapability, context.getHandler());
    if (required) {
      const scopes = (Array.isArray(token.scopes) ? token.scopes : []) as Capability[];
      const roleOk = roleCan(membership.role as Role, required);
      const scopeOk = scopes.includes(required);
      if (!roleOk || !scopeOk) {
        throw new InsufficientScopeError();
      }
    }

    // env-rooted routes: resolve and verify the environment belongs to project.
    const environmentId = request.params?.environmentId as string | undefined;
    if (environmentId) {
      const environment = await this.prisma.environment.findUnique({
        where: { id: environmentId },
      });
      if (!environment || environment.deleted) {
        throw new InvalidApiKeyError();
      }
      if (environment.projectId !== projectId) {
        throw new EnvironmentProjectMismatchError();
      }
      request.environment = environment;
    }

    request.apiToken = token;
    request.projectId = projectId;

    // Fire-and-forget usage tracking; never block or fail the request on this.
    this.prisma.apiToken
      .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return true;
  }

  private extractBearer(request: { headers?: Record<string, unknown> }): string | null {
    const authHeader = request.headers?.authorization;
    if (typeof authHeader !== 'string') {
      return null;
    }
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer') {
      return null;
    }
    return token ?? null;
  }
}
