import { Injectable } from '@nestjs/common';
import { roleCan } from '@usertour/constants';
import { Capability, Role } from '@usertour/types';
import { Environment, Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

import {
  EnvironmentNotInTokenScopeError,
  EnvironmentProjectMismatchError,
  ExpiredApiKeyError,
  InsufficientScopeError,
  InvalidApiKeyError,
  MissingApiKeyError,
  ProjectNotInTokenScopeError,
} from '@/common/errors';

import { hashApiTokenSecret, stripTokenPrefix } from './api-token.crypto';

/** An authenticated ApiToken row with its project scope loaded. */
export type AuthedApiToken = Prisma.ApiTokenGetPayload<{
  include: { projects: { select: { projectId: true } } };
}>;

/**
 * Shared ApiToken auth primitives, used by both {@link ApiTokenGuard} (v2
 * project-rooted REST routes) and the MCP endpoint (no project in the path —
 * the project comes from the token). Keeps the hash lookup + role∩scope rule in
 * one place so the two surfaces can't drift.
 */
@Injectable()
export class ApiTokenAuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve an `Authorization` header value to an active, unexpired token (with
   * its project scope). Throws the public OpenAPI errors on any failure.
   * Touches `lastUsedAt` fire-and-forget.
   */
  async authenticate(authHeader: unknown): Promise<AuthedApiToken> {
    const raw = this.extractBearer(authHeader);
    if (!raw) {
      throw new MissingApiKeyError();
    }
    // Accept both `utp_` (personal) and `uto_` (OAuth-issued) — same hash lookup.
    const secret = stripTokenPrefix(raw);
    if (secret === null) {
      throw new InvalidApiKeyError();
    }

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

    this.prisma.apiToken
      .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return token;
  }

  /** The token's granted capabilities (its `scopes` JSON column as Capability[]). */
  scopes(token: AuthedApiToken): Capability[] {
    return (Array.isArray(token.scopes) ? token.scopes : []) as Capability[];
  }

  /**
   * The environment ids this token may ACT ON, or `null` for "all environments"
   * (the legacy/back-compat default — a token created before env-scoping, or one
   * deliberately granted every environment).
   */
  allowedEnvironmentIds(token: AuthedApiToken): string[] | null {
    return Array.isArray(token.allowedEnvironmentIds)
      ? (token.allowedEnvironmentIds as string[])
      : null;
  }

  /**
   * Assert the token may act on `environment`. The third permission dimension
   * (alongside project + capability): a token restricted to a set of environments
   * may only read/write/publish within them. `null` allowedEnvironmentIds = all.
   * Call AFTER {@link authorize} and after the env is resolved — applies to every
   * env-targeted operation, read and write alike.
   */
  assertEnvironmentInScope(token: AuthedApiToken, environment: { id: string }): void {
    const allowed = this.allowedEnvironmentIds(token);
    if (allowed && !allowed.includes(environment.id)) {
      throw new EnvironmentNotInTokenScopeError();
    }
  }

  /**
   * Assert the token may act on `projectId`, and (if `capability` is given) may
   * exercise it: `projectId ∈ token.projects` AND the owner still has a live
   * role on that project AND `capability ∈ ROLE_CAPABILITIES[role] ∩ scopes`.
   */
  async authorize(
    token: AuthedApiToken,
    projectId: string,
    capability?: Capability,
  ): Promise<void> {
    if (!token.projects.some((p) => p.projectId === projectId)) {
      throw new ProjectNotInTokenScopeError();
    }
    const membership = await this.prisma.userOnProject.findFirst({
      where: { userId: token.userId, projectId },
    });
    if (!membership) {
      throw new ProjectNotInTokenScopeError();
    }
    if (capability) {
      const roleOk = roleCan(membership.role as Role, capability);
      const scopeOk = this.scopes(token).includes(capability);
      if (!roleOk || !scopeOk) {
        throw new InsufficientScopeError();
      }
    }
  }

  /** Load an environment and assert it belongs to `projectId`. */
  async resolveEnvironment(projectId: string, environmentId: string): Promise<Environment> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
    });
    if (!environment || environment.deleted) {
      throw new InvalidApiKeyError();
    }
    if (environment.projectId !== projectId) {
      throw new EnvironmentProjectMismatchError();
    }
    return environment;
  }

  private extractBearer(authHeader: unknown): string | null {
    if (typeof authHeader !== 'string') {
      return null;
    }
    const [type, value] = authHeader.split(' ');
    if (type !== 'Bearer') {
      return null;
    }
    return value ?? null;
  }
}
