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
}
