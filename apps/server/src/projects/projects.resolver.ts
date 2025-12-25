import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Project } from './models/project.model';
import { LicenseInfo } from './models/license-info.model';
import { ProjectsService } from './projects.service';
import { UserEntity } from '@/common/decorators/user.decorator';
import { User } from '@/users/models/user.model';
import { ProjectsGuard } from './projects.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesScopeEnum } from '@/common/decorators/roles.decorator';

@Resolver(() => Project)
export class ProjectsResolver {
  constructor(private projectsService: ProjectsService) {}

  @Query(() => LicenseInfo, { nullable: true })
  @UseGuards(ProjectsGuard)
  @Roles([RolesScopeEnum.OWNER])
  async getProjectLicenseInfo(@Args('projectId') projectId: string) {
    return this.projectsService.getProjectLicenseInfo(projectId);
  }

  @Mutation(() => Project)
  @UseGuards(ProjectsGuard)
  @Roles([RolesScopeEnum.OWNER])
  async updateProjectName(
    @UserEntity() user: User,
    @Args('projectId') projectId: string,
    @Args('name') name: string,
  ) {
    return this.projectsService.updateProjectName(user.id, projectId, name);
  }

  @Mutation(() => Project)
  @UseGuards(ProjectsGuard)
  @Roles([RolesScopeEnum.OWNER])
  async updateProjectLicense(
    @UserEntity() user: User,
    @Args('projectId') projectId: string,
    @Args('license') license: string,
  ) {
    return this.projectsService.updateProjectLicense(user.id, projectId, license);
  }
}
