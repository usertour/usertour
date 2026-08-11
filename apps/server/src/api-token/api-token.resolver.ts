import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { PrismaService } from 'nestjs-prisma';

import { AuditWeb } from '@/audit/audit.decorator';
import { UserEntity } from '@/common/decorators/user.decorator';
import { User } from '@/users/models/user.model';

import { ApiTokenService } from './api-token.service';
import {
  ApiToken,
  CreateApiTokenInput,
  CreatedApiToken,
  UpdateApiTokenInput,
} from './dto/api-token.dto';

type ApiTokenRow = Awaited<ReturnType<ApiTokenService['listTokens']>>[number];

/**
 * Personal keys are ACCOUNT-level (no `@RequirePermission` project context), but the
 * audit log is project-scoped — a key may be scoped to SEVERAL projects, so
 * attribute the entry to EVERY one, so "who minted / rotated / revoked which key"
 * shows up wherever an affected project's admins look (not one arbitrary project).
 */
const tokenProjectId = async (
  args: Record<string, unknown>,
  prisma: PrismaService,
): Promise<string[]> =>
  (
    await prisma.apiTokenOnProject.findMany({
      where: { apiTokenId: String(args.id) },
      select: { projectId: true },
    })
  ).map((r) => r.projectId);

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
  // The result's plaintext `token` never reaches the log (SECRET_KEYS redaction).
  @AuditWeb({
    action: 'create',
    resourceType: 'api_token',
    resourceId: (_args, result) =>
      String((result as { apiToken?: { id?: string } })?.apiToken?.id ?? ''),
    resolveProjectId: async (args) =>
      (args.input as { projectIds?: string[] } | undefined)?.projectIds ?? [],
  })
  async createApiToken(
    @UserEntity() user: User,
    @Args('input') input: CreateApiTokenInput,
  ): Promise<CreatedApiToken> {
    const { token, plaintext } = await this.apiTokenService.createToken(user.id, input);
    return { apiToken: this.toModel(token), token: plaintext };
  }

  @Mutation(() => ApiToken)
  @AuditWeb({ action: 'update', resourceType: 'api_token', resolveProjectId: tokenProjectId })
  async updateApiToken(
    @UserEntity() user: User,
    @Args('id') id: string,
    @Args('input') input: UpdateApiTokenInput,
  ): Promise<ApiToken> {
    const token = await this.apiTokenService.updateToken(user.id, id, input);
    return this.toModel(token);
  }

  @Mutation(() => CreatedApiToken)
  // Rotation is an update to the credential; the `operation` field records rotateApiToken.
  @AuditWeb({ action: 'update', resourceType: 'api_token', resolveProjectId: tokenProjectId })
  async rotateApiToken(@UserEntity() user: User, @Args('id') id: string): Promise<CreatedApiToken> {
    const { token, plaintext } = await this.apiTokenService.rotateToken(user.id, id);
    return { apiToken: this.toModel(token), token: plaintext };
  }

  @Mutation(() => Boolean)
  @AuditWeb({ action: 'delete', resourceType: 'api_token', resolveProjectId: tokenProjectId })
  async deleteApiToken(@UserEntity() user: User, @Args('id') id: string): Promise<boolean> {
    return this.apiTokenService.deleteToken(user.id, id);
  }

  private toModel(row: ApiTokenRow): ApiToken {
    return {
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      partialKey: row.partialKey,
      scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
      projectIds: row.projects.map((p) => p.projectId),
      // null/absent allowlist = "all environments"; surface as null so the UI can show "All".
      environmentIds: Array.isArray(row.allowedEnvironmentIds)
        ? (row.allowedEnvironmentIds as string[])
        : undefined,
      clientId: row.clientId ?? undefined,
      isActive: row.isActive,
      expiresAt: row.expiresAt ?? undefined,
      lastUsedAt: row.lastUsedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
