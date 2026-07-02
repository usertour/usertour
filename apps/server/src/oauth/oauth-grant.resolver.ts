import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuditWeb } from '@/audit/audit.decorator';
import { UserEntity } from '@/common/decorators/user.decorator';
import { User } from '@/users/models/user.model';

import { OAuthConnection } from './dto/oauth-connection.dto';
import { OAuthService } from './oauth.service';

/**
 * Account-level "Connected apps": the OAuth grants a user has approved (e.g. an
 * MCP connector). Authenticated by the global GraphQL guard + {@link UserEntity};
 * a user only ever sees / revokes their own grants. Revoking kills the grant's
 * access tokens (via `ApiToken.oauthGrantId`) and its refresh lineage.
 */
@Resolver()
export class OAuthGrantResolver {
  constructor(private readonly oauth: OAuthService) {}

  @Query(() => [OAuthConnection])
  async oauthConnections(@UserEntity() user: User): Promise<OAuthConnection[]> {
    return this.oauth.listConnections(user.id);
  }

  @Mutation(() => Boolean)
  // Account-level; the audit log is project-scoped, so attribute the entry to the
  // grant's own project (OAuthGrant.projectId).
  @AuditWeb({
    action: 'delete',
    resourceType: 'oauth_grant',
    resolveProjectId: async (args, prisma) =>
      (
        await prisma.oAuthGrant.findUnique({
          where: { id: String(args.id) },
          select: { projectId: true },
        })
      )?.projectId,
  })
  async revokeOAuthConnection(@UserEntity() user: User, @Args('id') id: string): Promise<boolean> {
    return this.oauth.revokeConnection(user.id, id);
  }
}
