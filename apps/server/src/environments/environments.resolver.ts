import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { ProjectIdArgs } from './args/project-id.args';
import {
  CreateEnvironmentInput,
  DeleteEnvironmentInput,
  UpdateEnvironmentInput,
} from './dto/environment.input';
import { EnvironmentsService } from './environments.service';
import { Environment } from './models/environment.model';
import { InstallationStatus } from './models/installation-status.model';
import { AccessToken } from './dto/access-token.dto';
import { CreateAccessTokenInput } from './dto/access-token.dto';
import {
  EnvironmentSigningSecret,
  IdentityTokenDiagnosisModel,
  IdentityVerificationStats,
} from './dto/signing-secret.dto';

@Resolver(() => Environment)
@UseGuards(PermissionGuard)
export class EnvironmentsResolver {
  constructor(private environmentsService: EnvironmentsService) {}

  @Mutation(() => Environment)
  @RequirePermission({ capability: Capability.EnvironmentManage, scope: ScopeKind.Project })
  async createEnvironments(@Args('data') newData: CreateEnvironmentInput) {
    return this.environmentsService.create(newData);
  }

  @Mutation(() => Environment)
  @RequirePermission({ capability: Capability.EnvironmentManage, scope: ScopeKind.Environment })
  async updateEnvironments(@Args('data') input: UpdateEnvironmentInput) {
    return this.environmentsService.update(input);
  }

  @Mutation(() => Environment)
  @RequirePermission({ capability: Capability.EnvironmentManage, scope: ScopeKind.Environment })
  async deleteEnvironments(@Args('data') { id }: DeleteEnvironmentInput) {
    return await this.environmentsService.delete(id);
  }

  @Query(() => [Environment])
  @RequirePermission({ capability: Capability.EnvironmentRead, scope: ScopeKind.Project })
  userEnvironments(@Args() { projectId }: ProjectIdArgs) {
    return this.environmentsService.listEnvsByProjectId(projectId);
  }

  @Query(() => InstallationStatus)
  @RequirePermission({ capability: Capability.EnvironmentRead, scope: ScopeKind.Environment })
  async verifyInstallation(@Args('environmentId') environmentId: string) {
    return this.environmentsService.verifyInstallation(environmentId);
  }

  @Query(() => [AccessToken])
  @RequirePermission({ capability: Capability.AccessTokenRead, scope: ScopeKind.Environment })
  async listAccessTokens(@Args('environmentId') environmentId: string) {
    const accessTokens = await this.environmentsService.findAllAccessTokens(environmentId);
    return accessTokens.map((accessToken) => ({
      ...accessToken,
      accessToken: `ak_${accessToken.accessToken.slice(0, 4)}...${accessToken.accessToken.slice(-4)}`,
    }));
  }

  @Query(() => String)
  @RequirePermission({ capability: Capability.AccessTokenRead, scope: ScopeKind.Environment })
  async getAccessToken(
    @Args('environmentId') environmentId: string,
    @Args('accessTokenId') accessTokenId: string,
  ) {
    const accessToken = await this.environmentsService.findOneAccessToken(
      environmentId,
      accessTokenId,
    );
    return `ak_${accessToken.accessToken}`;
  }

  @Mutation(() => AccessToken)
  @RequirePermission({ capability: Capability.AccessTokenManage, scope: ScopeKind.Environment })
  async createAccessToken(
    @Args('environmentId') environmentId: string,
    @Args('input') input: CreateAccessTokenInput,
  ) {
    const accessToken = await this.environmentsService.createAccessToken(environmentId, input);
    return {
      ...accessToken,
      accessToken: `ak_${accessToken.accessToken}`,
    };
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.AccessTokenManage, scope: ScopeKind.Environment })
  async deleteAccessToken(
    @Args('environmentId') environmentId: string,
    @Args('accessTokenId') accessTokenId: string,
  ) {
    await this.environmentsService.removeAccessToken(environmentId, accessTokenId);
    return true;
  }

  // Identity verification (ADR 0008). Signing secrets are environment
  // credentials of the same sensitivity class as API access tokens, so the
  // whole surface rides the AccessToken capabilities (OWNER-only).

  @Query(() => [EnvironmentSigningSecret])
  @RequirePermission({ capability: Capability.AccessTokenRead, scope: ScopeKind.Environment })
  async listSigningSecrets(@Args('environmentId') environmentId: string) {
    const signingSecrets = await this.environmentsService.listActiveSigningSecrets(environmentId);
    return signingSecrets.map((signingSecret) => ({
      ...signingSecret,
      secret: `${signingSecret.secret.slice(0, 7)}...${signingSecret.secret.slice(-4)}`,
    }));
  }

  @Query(() => String)
  @RequirePermission({ capability: Capability.AccessTokenRead, scope: ScopeKind.Environment })
  async getSigningSecret(
    @Args('environmentId') environmentId: string,
    @Args('signingSecretId') signingSecretId: string,
  ) {
    const signingSecret = await this.environmentsService.getSigningSecret(
      environmentId,
      signingSecretId,
    );
    return signingSecret.secret;
  }

  @Mutation(() => EnvironmentSigningSecret)
  @RequirePermission({ capability: Capability.AccessTokenManage, scope: ScopeKind.Environment })
  async createSigningSecret(@Args('environmentId') environmentId: string) {
    return await this.environmentsService.createSigningSecret(environmentId);
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.AccessTokenManage, scope: ScopeKind.Environment })
  async revokeSigningSecret(
    @Args('environmentId') environmentId: string,
    @Args('signingSecretId') signingSecretId: string,
  ) {
    await this.environmentsService.revokeSigningSecret(environmentId, signingSecretId);
    return true;
  }

  @Mutation(() => Environment)
  @RequirePermission({ capability: Capability.AccessTokenManage, scope: ScopeKind.Environment })
  async setRequireIdentityVerification(
    @Args('environmentId') environmentId: string,
    @Args('required') required: boolean,
  ) {
    return await this.environmentsService.setRequireIdentityVerification(environmentId, required);
  }

  @Query(() => [IdentityVerificationStats])
  @RequirePermission({ capability: Capability.AccessTokenRead, scope: ScopeKind.Environment })
  async getIdentityVerificationStats(@Args('environmentId') environmentId: string) {
    return await this.environmentsService.getIdentityVerificationStats(environmentId);
  }

  @Query(() => IdentityTokenDiagnosisModel)
  @RequirePermission({ capability: Capability.AccessTokenRead, scope: ScopeKind.Environment })
  async validateIdentityToken(
    @Args('environmentId') environmentId: string,
    @Args('token') token: string,
  ) {
    return await this.environmentsService.validateIdentityToken(environmentId, token);
  }
}
