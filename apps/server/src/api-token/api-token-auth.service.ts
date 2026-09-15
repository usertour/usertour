import { Injectable, Logger } from '@nestjs/common';
import { roleCan } from '@usertour/constants';
import { Capability, Role } from '@usertour/types';
import { Environment, Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

import { publishWhitelistOf } from '@/auth/permission/publish-whitelist';

import {
  EnvironmentNotFoundError,
  EnvironmentNotInTokenScopeError,
  EnvironmentProjectMismatchError,
  ExpiredApiKeyError,
  InsufficientScopeError,
  InvalidApiKeyError,
  MemberCannotPublishToEnvironmentError,
  MissingApiKeyError,
  ProjectNotInTokenScopeError,
} from '@/common/errors';

import { hashApiTokenSecret, stripTokenPrefix } from './api-token.crypto';

/** An authenticated ApiToken row with its project scope loaded. */
export type AuthedApiToken = Prisma.ApiTokenGetPayload<{
  include: {
    projects: { select: { projectId: true } };
    user: { select: { disabled: true } };
  };
}> & {
  /**
   * The key owner's membership PUBLISH whitelist on the authorized project
   * (UserOnProject.allowedEnvironmentIds), cached by
   * {@link ApiTokenAuthService.authorize} next to `memberRole`. Consulted only
   * by {@link ApiTokenAuthService.assertMayPublishTo}: an EDITOR must not
   * escape their publish whitelist by minting a key scoped to more environments.
   */
  memberPublishEnvironmentIds?: string[];
  /**
   * The owner's live role on the authorized project, cached by `authorize`
   * (which always runs first via the guard) so response-shaping probes like
   * `hasCapability` don't re-query the membership row. Bound to the project
   * it was resolved for — a probe against a DIFFERENT project must not read
   * this cache.
   */
  memberRole?: Role;
  memberRoleProjectId?: string;
};

/**
 * Shared ApiToken auth primitives, used by both {@link ApiTokenGuard} (v2
 * project-rooted REST routes) and the MCP endpoint (no project in the path —
 * the project comes from the token). Keeps the hash lookup + role∩scope rule in
 * one place so the two surfaces can't drift.
 */
@Injectable()
export class ApiTokenAuthService {
  private readonly logger = new Logger(ApiTokenAuthService.name);

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
      include: {
        projects: { select: { projectId: true } },
        user: { select: { disabled: true } },
      },
    });
    if (!token || !token.isActive) {
      throw new InvalidApiKeyError();
    }
    // The owner's account state gates every credential they minted: disabling a
    // user refuses their dashboard sessions (validateUser), and the same must
    // hold for their machine credentials — `utp_` and `uto_` alike (re-enabling
    // restores them, symmetric with sessions). Deliberately the same opaque 401
    // as an unknown key: the holder may not BE the owner, so the account's
    // state is not theirs to learn.
    if (token.user.disabled) {
      // The client gets the opaque E1000; the REAL reason lands here so an admin
      // tracing "why does this key 403" finds the answer in the server log.
      this.logger.warn(
        `API token ${token.id} ("${token.name}") refused: owner account is disabled`,
      );
      throw new InvalidApiKeyError();
    }
    if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) {
      throw new ExpiredApiKeyError();
    }

    // Touch lastUsedAt at most once a minute: agent/MCP traffic authenticates
    // dozens of times a minute per token, and a per-request UPDATE would double
    // the table's write volume for a timestamp nobody reads at that granularity.
    // The row is already in hand, so the staleness check costs nothing.
    if (!token.lastUsedAt || Date.now() - token.lastUsedAt.getTime() > 60_000) {
      this.prisma.apiToken
        .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
        .catch(() => undefined);
    }

    return token;
  }

  /** The token's granted capabilities (its `scopes` JSON column as Capability[]). */
  scopes(token: AuthedApiToken): Capability[] {
    return (Array.isArray(token.scopes) ? token.scopes : []) as Capability[];
  }

  /**
   * The environment ids this token may ACT ON, or `null` for "all environments"
   * (the legacy/back-compat default — a token created before env-scoping, or one
   * deliberately granted every environment). The key's own allowlist only: the
   * owner's membership never restricts reads or writes by environment, it only
   * bounds publishing (see {@link assertMayPublishTo}).
   */
  allowedEnvironmentIds(token: AuthedApiToken): string[] | null {
    return environmentAllowlistOf(token.allowedEnvironmentIds);
  }

  /**
   * The environments this key may PUBLISH to: its environment scope
   * (`allowedEnvironmentIds`, null = all) narrowed by the owner's publish
   * whitelist when the owner's role lacks ContentPublishAnyEnvironment. Null
   * means "every environment in scope" (ADMIN / OWNER with an unrestricted
   * key); an empty list means nowhere. Call after `authorize` for the SAME
   * project — the cached role and whitelist belong to the project authorize
   * resolved, so any other project fails closed to nowhere (as
   * assertMayPublishTo does), never to a neighbouring project's verdict.
   */
  publishableEnvironmentIds(token: AuthedApiToken, projectId: string): string[] | null {
    if (!token.memberRole || token.memberRoleProjectId !== projectId) {
      return [];
    }
    const scope = this.allowedEnvironmentIds(token);
    if (roleCan(token.memberRole, Capability.ContentPublishAnyEnvironment)) {
      return scope;
    }
    const whitelist = token.memberPublishEnvironmentIds ?? [];
    return scope ? whitelist.filter((id) => scope.includes(id)) : whitelist;
  }

  /**
   * Assert the key's OWNER may publish to `environmentId`: a role without
   * ContentPublishAnyEnvironment (EDITOR) is limited to its membership publish
   * whitelist whatever the key itself is scoped to. Call after `authorize` for
   * the SAME `projectId` (which caches the role and whitelist for that project)
   * and after `assertEnvironmentInScope`.
   */
  assertMayPublishTo(token: AuthedApiToken, projectId: string, environmentId: string): void {
    // `authorize` always runs first (guard) and caches the verdict for ONE
    // project. A missing role, or a cache from another project (a multi-project
    // key), must fail closed rather than let a neighbouring project's role or
    // whitelist decide this publish.
    if (!token.memberRole || token.memberRoleProjectId !== projectId) {
      throw new MemberCannotPublishToEnvironmentError();
    }
    if (roleCan(token.memberRole, Capability.ContentPublishAnyEnvironment)) {
      return;
    }
    if (!(token.memberPublishEnvironmentIds ?? []).includes(environmentId)) {
      throw new MemberCannotPublishToEnvironmentError();
    }
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
    // Cache the owner's live role and publish whitelist for assertMayPublishTo /
    // hasCapability — see AuthedApiToken.
    token.memberRole = membership.role as Role;
    token.memberRoleProjectId = projectId;
    token.memberPublishEnvironmentIds = publishWhitelistOf(membership.allowedEnvironmentIds);
    if (capability) {
      const roleOk = roleCan(membership.role as Role, capability);
      const scopeOk = this.scopes(token).includes(capability);
      if (!roleOk || !scopeOk) {
        throw new InsufficientScopeError();
      }
    }
  }

  /**
   * Non-throwing capability probe for RESPONSE SHAPING (e.g. whether a GET
   * may include the signing secret): same rule as `authorize`'s capability
   * branch — live role allows it AND the token's scopes carry it.
   */
  async hasCapability(
    token: AuthedApiToken,
    projectId: string,
    capability: Capability,
  ): Promise<boolean> {
    // `authorize` (always first, via the guard) cached the live role on the
    // token; use it only when it was resolved for THIS project, and fall
    // back to the membership query otherwise.
    let role = token.memberRoleProjectId === projectId ? token.memberRole : undefined;
    if (!role) {
      const membership = await this.prisma.userOnProject.findFirst({
        where: { userId: token.userId, projectId },
      });
      if (!membership) {
        return false;
      }
      role = membership.role as Role;
    }
    return roleCan(role, capability) && this.scopes(token).includes(capability);
  }

  /** Load an environment and assert it belongs to `projectId`. */
  async resolveEnvironment(projectId: string, environmentId: string): Promise<Environment> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
    });
    if (!environment || environment.deleted) {
      // A path-param environment that doesn't exist is a 404, not a credential
      // failure — throwing InvalidApiKeyError here mislabeled a bad :environmentId
      // as "invalid API key".
      throw new EnvironmentNotFoundError();
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
    // The auth scheme is case-insensitive per RFC 7235 (`bearer` / `BEARER` are valid).
    if (type?.toLowerCase() !== 'bearer') {
      return null;
    }
    return value ?? null;
  }
}

/**
 * A token's JSONB environment allowlist as `string[]`, or null for
 * "unrestricted". Shared by the guard and the `/v2/me` discovery route so what
 * /v2/me lists can never drift from what the guard admits.
 */
export const environmentAllowlistOf = (value: unknown): string[] | null =>
  Array.isArray(value) ? (value as string[]) : null;
