import { Injectable } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import {
  API_TOKEN_PREFIX,
  composeApiToken,
  generateApiTokenSecret,
  hashApiTokenSecret,
  partialApiTokenSecret,
} from './api-token.crypto';

export interface CreateApiTokenInput {
  name: string;
  projectIds: string[];
  scopes: Capability[];
  expiresAt?: Date | null;
}

@Injectable()
export class ApiTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a token for `userId`. The caller (resolver) must have verified the
   * user is a member of every project in `input.projectIds`. The plaintext
   * token is returned exactly once and never stored.
   */
  async createToken(userId: string, input: CreateApiTokenInput) {
    const secret = generateApiTokenSecret();
    const token = await this.prisma.apiToken.create({
      data: {
        userId,
        name: input.name,
        prefix: API_TOKEN_PREFIX,
        hashedSecret: hashApiTokenSecret(secret),
        partialKey: partialApiTokenSecret(secret),
        scopes: input.scopes,
        expiresAt: input.expiresAt ?? null,
        projects: {
          create: input.projectIds.map((projectId) => ({ projectId })),
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
