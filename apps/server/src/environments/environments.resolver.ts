import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { EnvironmentsService } from "./environments.service";
import { Environment } from "./models/environment.model";
import {
  CreateEnvironmentInput,
  DeleteEnvironmentInput,
  UpdateEnvironmentInput,
} from "./dto/environment.input";
import { ProjectIdArgs } from "./args/project-id.args";
import { UseGuards } from "@nestjs/common";
import { RolesScopeEnum, Roles } from "@/common/decorators/roles.decorator";
import { EnvironmentsGuard } from "./environments.guard";

@Resolver(() => Environment)
@UseGuards(EnvironmentsGuard)
export class EnvironmentsResolver {
  constructor(private environmentsService: EnvironmentsService) {}

  @Mutation(() => Environment)
  @Roles([RolesScopeEnum.ADMIN])
  async createEnvironments(@Args("data") newData: CreateEnvironmentInput) {
    return this.environmentsService.create(newData);
  }

  @Mutation(() => Environment)
  @Roles([RolesScopeEnum.ADMIN])
  async updateEnvironments(@Args("data") input: UpdateEnvironmentInput) {
    return this.environmentsService.update(input);
  }

  @Mutation(() => Environment)
  @Roles([RolesScopeEnum.ADMIN])
  async deleteEnvironments(@Args("data") { id }: DeleteEnvironmentInput) {
    return await this.environmentsService.delete(id);
  }

  @Query(() => [Environment])
  @Roles([RolesScopeEnum.ADMIN, RolesScopeEnum.USER])
  userEnvironments(@Args() { projectId }: ProjectIdArgs) {
    return this.environmentsService.listEnvsByProjectId(projectId);
  }
}
