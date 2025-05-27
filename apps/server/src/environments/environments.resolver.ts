import { Roles, RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ProjectIdArgs } from './args/project-id.args';
import {
  CreateEnvironmentInput,
  DeleteEnvironmentInput,
  UpdateEnvironmentInput,
} from './dto/environment.input';
import { EnvironmentsGuard } from './environments.guard';
import { EnvironmentsService } from './environments.service';
import { Environment } from './models/environment.model';
import { AccessToken } from './dto/access-token.dto';
import { CreateAccessTokenInput } from './dto/access-token.dto';

@Resolver(() => Environment)
@UseGuards(EnvironmentsGuard)
export class EnvironmentsResolver {
  constructor(private environmentsService: EnvironmentsService) {}

  @Mutation(() => Environment)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async createEnvironments(@Args('data') newData: CreateEnvironmentInput) {
    return this.environmentsService.create(newData);
  }

  @Mutation(() => Environment)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async updateEnvironments(@Args('data') input: UpdateEnvironmentInput) {
    return this.environmentsService.update(input);
  }

  @Mutation(() => Environment)
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER])
  async deleteEnvironments(@Args('data') { id }: DeleteEnvironmentInput) {
    return await this.environmentsService.delete(id);
  }

  @Query(() => [Environment])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.OWNER, RolesScopeEnum.VIEWER])
  userEnvironments(@Args() { projectId }: ProjectIdArgs) {
    return this.environmentsService.listEnvsByProjectId(projectId);
  }

  @Query(() => [AccessToken])
  @Roles([RolesScopeEnum.OWNER])
  async listAccessTokens(@Args('environmentId') environmentId: string) {
    const accessTokens = await this.environmentsService.findAllAccessTokens(environmentId);
    return accessTokens.map((accessToken) => ({
      ...accessToken,
      accessToken: `ak_${accessToken.accessToken.slice(0, 4)}...${accessToken.accessToken.slice(-4)}`,
    }));
  }

  @Query(() => String)
  @Roles([RolesScopeEnum.OWNER])
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
  @Roles([RolesScopeEnum.OWNER])
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
  @Roles([RolesScopeEnum.OWNER])
  async deleteAccessToken(
    @Args('environmentId') environmentId: string,
    @Args('accessTokenId') accessTokenId: string,
  ) {
    await this.environmentsService.removeAccessToken(environmentId, accessTokenId);
    return true;
  }
}
