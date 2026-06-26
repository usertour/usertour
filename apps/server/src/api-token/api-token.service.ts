import { Injectable } from '@nestjs/common';
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
    await this.requireOwnToken(userId, id);

    const data: {
      name?: string;
      scopes?: string[];
      projects?: { deleteMany: Record<string, never>; create: { projectId: string }[] };
    } = {};

    if (input.name !== undefined) {
      data.name = input.name;
    }
    if (input.scopes !== undefined) {
      data.scopes = this.validateScopes(input.scopes);
    }
    if (input.projectIds !== undefined) {
      const projectIds = await this.validateProjects(userId, input.projectIds);
      // Replace the join rows wholesale — the set of projects is small and the
      // edit is explicit, so a delete-all + recreate is simpler than diffing.
      data.projects = {
        deleteMany: {},
        create: projectIds.map((projectId) => ({ projectId })),
      };
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
  private async requireOwnToken(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.apiToken.findFirst({
      where: { id, userId, clientId: null },
      select: { id: true },
    });
    if (!existing) {
      throw new ParamsError('Token not found');
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

  /** Dedupe + validate that projects are non-empty and the user belongs to each. */
  private async validateProjects(userId: string, input: string[]): Promise<string[]> {
    const projectIds = [...new Set(input)];
    if (projectIds.length === 0) {
      throw new ParamsError('At least one project is required');
    }
    for (const projectId of projectIds) {
      const membership = await this.prisma.userOnProject.findFirst({
        where: { userId, projectId },
      });
      if (!membership) {
        throw new ParamsError(`No access to project: ${projectId}`);
      }
    }
    return projectIds;
  }
}
