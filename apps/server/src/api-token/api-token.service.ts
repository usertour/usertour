import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { environmentSelectionMissing } from '@usertour/helpers';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { ParamsError } from '@/common/errors';

import {
  API_TOKEN_PREFIX,
  composeApiToken,
  generateApiTokenSecret,
  hashApiTokenSecret,
  partialApiTokenSecret,
} from './api-token.crypto';
import { CreateApiTokenInput, UpdateApiTokenInput } from './dto/api-token.dto';

const KNOWN_CAPABILITIES = new Set<string>(Object.values(Capability));

const TOKEN_INCLUDE = { projects: true } as const;

@Injectable()
export class ApiTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a token for `userId`. Validates that every scope is a known
   * Capability and that the user is a member of every requested project (a
   * token can never reach a project its owner cannot). The plaintext token is
   * returned exactly once and never stored.
   */
  async createToken(userId: string, input: CreateApiTokenInput) {
    const scopes = this.validateScopes(input.scopes);
    const projectIds = await this.validateProjects(userId, input.projectIds);
    const allowedEnvironmentIds = await this.validateEnvironments(projectIds, input.environmentIds);
    this.assertEnvironmentScopeNamed(scopes, allowedEnvironmentIds ?? null);

    if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) {
      throw new ParamsError('expiresAt must be in the future');
    }

    const secret = generateApiTokenSecret();
    const token = await this.prisma.apiToken.create({
      data: {
        userId,
        name: input.name,
        prefix: API_TOKEN_PREFIX,
        hashedSecret: hashApiTokenSecret(secret),
        partialKey: partialApiTokenSecret(secret),
        scopes,
        // undefined → column stays null = "all environments" (back-compat default).
        allowedEnvironmentIds,
        expiresAt: input.expiresAt ?? null,
        projects: {
          create: projectIds.map((projectId) => ({ projectId })),
        },
      },
      include: TOKEN_INCLUDE,
    });

    return { token, plaintext: composeApiToken(secret) };
  }

  /**
   * List the caller's own PERSONAL tokens (never returns the secret).
   * `clientId: null` excludes OAuth-issued (`uto_`) access tokens — those share
   * this table but are managed solely via "Connected apps" (oauthConnections /
   * revokeGrant), never as personal keys.
   */
  async listTokens(userId: string) {
    return this.prisma.apiToken.findMany({
      where: { userId, clientId: null },
      include: TOKEN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a token's name, scopes, and/or project scope. Only the fields
   * present on `input` change. Scoped to `userId` so a user can only edit their
   * own tokens. The secret is untouched — use {@link rotateToken} to replace it.
   */
  async updateToken(userId: string, id: string, input: UpdateApiTokenInput) {
    const existing = await this.requireOwnToken(userId, id);

    const data: {
      name?: string;
      scopes?: string[];
      allowedEnvironmentIds?: string[] | typeof Prisma.DbNull;
      projects?: { deleteMany: Record<string, never>; create: { projectId: string }[] };
    } = {};

    if (input.name !== undefined) {
      data.name = input.name;
    }
    if (input.scopes !== undefined) {
      data.scopes = this.validateScopes(input.scopes);
    }
    let projectIds: string[] | undefined;
    if (input.projectIds !== undefined) {
      projectIds = await this.validateProjects(userId, input.projectIds);
      // Replace the join rows wholesale — the set of projects is small and the
      // edit is explicit, so a delete-all + recreate is simpler than diffing.
      data.projects = {
        deleteMany: {},
        create: projectIds.map((projectId) => ({ projectId })),
      };
    }

    // Environment allowlist: three-state input, resolved to an explicit action.
    // undefined = untouched; null = clear ("not applicable" — only valid while
    // the FINAL scopes are project-level); array = validate and set.
    let environmentAction: 'set' | 'clear' | 'keep' = 'keep';
    let validatedEnvironmentIds: string[] | undefined;
    if (input.environmentIds !== undefined && input.environmentIds !== null) {
      const scopeProjects = projectIds ?? (await this.ownTokenProjectIds(id));
      validatedEnvironmentIds = await this.validateEnvironments(
        scopeProjects,
        input.environmentIds,
      );
      environmentAction = 'set';
    } else if (input.environmentIds === null) {
      environmentAction = 'clear';
    } else if (projectIds !== undefined) {
      // Project ids arrived without a new environment list. Clear the allowlist
      // ONLY when the project set actually CHANGED: the old allowlist then holds
      // the PREVIOUS project's environment ids (env ids never span projects), and
      // leaving it would brick every env-scoped call under the new project.
      // An unchanged set (clients naturally echo current projectIds on a rename)
      // must NOT silently widen an environment-restricted token to all envs.
      const current = await this.ownTokenProjectIds(id);
      const changed =
        projectIds.length !== current.length || projectIds.some((p) => !current.includes(p));
      if (changed) {
        environmentAction = 'clear';
      }
    }

    // Enforce the env-naming rule on the FINAL state (scopes and allowlist as
    // they will be after this update) — so adding an env-targeted scope, lifting
    // the list, or a project change all hit the same gate.
    const finalScopes = data.scopes ?? (existing.scopes as string[]) ?? [];
    const finalEnvironmentIds =
      environmentAction === 'set'
        ? (validatedEnvironmentIds ?? null)
        : environmentAction === 'clear'
          ? null
          : Array.isArray(existing.allowedEnvironmentIds)
            ? (existing.allowedEnvironmentIds as string[])
            : null;
    this.assertEnvironmentScopeNamed(finalScopes, finalEnvironmentIds);

    if (environmentAction === 'set' && validatedEnvironmentIds !== undefined) {
      data.allowedEnvironmentIds = validatedEnvironmentIds;
    } else if (environmentAction === 'clear') {
      data.allowedEnvironmentIds = Prisma.DbNull;
    }

    return this.prisma.apiToken.update({
      where: { id },
      data,
      include: TOKEN_INCLUDE,
    });
  }

  /**
   * Rotate a token's secret: generate a fresh secret, replace the stored hash +
   * partial, and return the new plaintext exactly once. Name, scopes, projects,
   * and expiry are preserved; the previous secret stops working immediately.
   * Scoped to `userId`.
   */
  async rotateToken(userId: string, id: string) {
    await this.requireOwnToken(userId, id);

    const secret = generateApiTokenSecret();
    const token = await this.prisma.apiToken.update({
      where: { id },
      data: {
        hashedSecret: hashApiTokenSecret(secret),
        partialKey: partialApiTokenSecret(secret),
      },
      include: TOKEN_INCLUDE,
    });

    return { token, plaintext: composeApiToken(secret) };
  }

  /**
   * Permanently delete a token. Scoped to `userId` so a user can only delete
   * their own tokens. Returns true if a token was deleted.
   */
  async deleteToken(userId: string, id: string): Promise<boolean> {
    // `clientId: null` so this can only delete personal keys — deleting an OAuth
    // token here would be a false revoke (it leaves the grant + refresh token
    // alive, so the app re-mints on next refresh). Revoke OAuth via revokeGrant.
    const result = await this.prisma.apiToken.deleteMany({
      where: { id, userId, clientId: null },
    });
    return result.count > 0;
  }

  /**
   * Assert the token exists, belongs to `userId`, and is a PERSONAL key, or
   * throw. `clientId: null` keeps update/rotate off OAuth tokens (their secret,
   * scopes, and lifecycle are owned by the OAuth grant, not this surface).
   */
  private async requireOwnToken(userId: string, id: string) {
    const existing = await this.prisma.apiToken.findFirst({
      where: { id, userId, clientId: null },
      select: { id: true, scopes: true, allowedEnvironmentIds: true },
    });
    if (!existing) {
      throw new ParamsError('Token not found');
    }
    return existing;
  }

  /**
   * Env-targeted scopes must NAME their environments — "all environments" is not
   * grantable for capabilities that act on a specific environment (the web form
   * and consent page enforce the same rule client-side; this is the SSOT). A
   * credential holding only project-level scopes never consults its environment
   * list, so null stays valid ("not applicable") there.
   */
  private assertEnvironmentScopeNamed(
    scopes: string[],
    environmentIds: string[] | null | undefined,
  ): void {
    if (environmentSelectionMissing(scopes, environmentIds)) {
      throw new ParamsError(
        'environmentIds is required: the selected scopes act on specific environments (end-user data reads/writes, session/segment access, analytics, content publish). Name the environments this token may act on.',
      );
    }
  }

  /** Dedupe + validate that scopes are non-empty and all known capabilities. */
  private validateScopes(input: string[]): string[] {
    const scopes = [...new Set(input)];
    if (scopes.length === 0) {
      throw new ParamsError('At least one scope is required');
    }
    const unknown = scopes.filter((s) => !KNOWN_CAPABILITIES.has(s));
    if (unknown.length > 0) {
      throw new ParamsError(`Unknown scope(s): ${unknown.join(', ')}`);
    }
    return scopes;
  }

  /**
   * Validate an optional environment allowlist: each env must belong to one of the token's
   * projects (a token can never reach an environment outside its project scope). `undefined`
   * / `null` → `undefined` = "all environments" (back-compat). A provided list must be
   * non-empty.
   */
  private async validateEnvironments(
    projectIds: string[],
    input: string[] | null | undefined,
  ): Promise<string[] | undefined> {
    if (input == null) {
      return undefined;
    }
    const environmentIds = [...new Set(input)];
    if (environmentIds.length === 0) {
      throw new ParamsError('At least one environment is required when environmentIds is provided');
    }
    const environments = await this.prisma.environment.findMany({
      where: { id: { in: environmentIds }, deleted: false },
      select: { id: true, projectId: true },
    });
    const inProject = new Set(
      environments.filter((e) => projectIds.includes(e.projectId)).map((e) => e.id),
    );
    const bad = environmentIds.filter((id) => !inProject.has(id));
    if (bad.length > 0) {
      throw new ParamsError(`Environment(s) not in the token's project(s): ${bad.join(', ')}`);
    }
    return environmentIds;
  }

  /** The project ids a token is currently scoped to (for validating an env-only update). */
  private async ownTokenProjectIds(id: string): Promise<string[]> {
    const token = await this.prisma.apiToken.findUnique({
      where: { id },
      include: { projects: { select: { projectId: true } } },
    });
    return token?.projects.map((p) => p.projectId) ?? [];
  }

  /** Dedupe + validate that projects are non-empty and the user belongs to each. */
  private async validateProjects(userId: string, input: string[]): Promise<string[]> {
    const projectIds = [...new Set(input)];
    if (projectIds.length === 0) {
      throw new ParamsError('At least one project is required');
    }
    // One membership query for all target projects (not a findFirst per project).
    const memberships = await this.prisma.userOnProject.findMany({
      where: { userId, projectId: { in: projectIds } },
      select: { projectId: true },
    });
    const allowed = new Set(memberships.map((m) => m.projectId));
    const missing = projectIds.find((projectId) => !allowed.has(projectId));
    if (missing) {
      throw new ParamsError(`No access to project: ${missing}`);
    }
    return projectIds;
  }
}
