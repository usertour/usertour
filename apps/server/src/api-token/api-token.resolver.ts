import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { UserEntity } from '@/common/decorators/user.decorator';
import { User } from '@/users/models/user.model';

import { ApiTokenService } from './api-token.service';
import { ApiToken, CreateApiTokenInput, CreatedApiToken } from './dto/api-token.dto';

type ApiTokenRow = Awaited<ReturnType<ApiTokenService['listTokens']>>[number];

/**
 * Self-service management of the caller's own API tokens. Authentication is
 * enforced by the global auth guard (populates the user); authority is "your
 * own tokens / projects you belong to", validated in the service.
 */
@Resolver(() => ApiToken)
export class ApiTokenResolver {
  constructor(private readonly apiTokenService: ApiTokenService) {}

  @Query(() => [ApiToken])
  async apiTokens(@UserEntity() user: User): Promise<ApiToken[]> {
    const tokens = await this.apiTokenService.listTokens(user.id);
    return tokens.map((token) => this.toModel(token));
  }

  @Mutation(() => CreatedApiToken)
  async createApiToken(
    @UserEntity() user: User,
    @Args('input') input: CreateApiTokenInput,
  ): Promise<CreatedApiToken> {
    const { token, plaintext } = await this.apiTokenService.createToken(user.id, input);
    return { apiToken: this.toModel(token), token: plaintext };
  }

  @Mutation(() => Boolean)
  async revokeApiToken(@UserEntity() user: User, @Args('id') id: string): Promise<boolean> {
    return this.apiTokenService.revokeToken(user.id, id);
  }

  private toModel(row: ApiTokenRow): ApiToken {
    return {
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      partialKey: row.partialKey,
      scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
      projectIds: row.projects.map((p) => p.projectId),
      clientId: row.clientId ?? undefined,
      isActive: row.isActive,
      expiresAt: row.expiresAt ?? undefined,
      lastUsedAt: row.lastUsedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
