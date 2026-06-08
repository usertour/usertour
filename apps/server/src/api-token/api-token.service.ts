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
import { CreateApiTokenInput } from './dto/api-token.dto';

const KNOWN_CAPABILITIES = new Set<string>(Object.values(Capability));

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
    const scopes = [...new Set(input.scopes)];
    if (scopes.length === 0) {
      throw new ParamsError('At least one scope is required');
    }
    const unknown = scopes.filter((s) => !KNOWN_CAPABILITIES.has(s));
    if (unknown.length > 0) {
      throw new ParamsError(`Unknown scope(s): ${unknown.join(', ')}`);
    }

    const projectIds = [...new Set(input.projectIds)];
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
      include: { projects: true },
    });

    return { token, plaintext: composeApiToken(secret) };
  }

  /** List the caller's own tokens (never returns the secret). */
  async listTokens(userId: string) {
    return this.prisma.apiToken.findMany({
      where: { userId },
      include: { projects: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke a token. Scoped to `userId` so a user can only revoke their own
   * tokens. Returns true if a token was revoked.
   */
  async revokeToken(userId: string, id: string): Promise<boolean> {
    const result = await this.prisma.apiToken.updateMany({
      where: { id, userId, isActive: true },
      data: { isActive: false },
    });
    return result.count > 0;
  }
}
