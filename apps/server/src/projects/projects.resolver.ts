import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Project } from './models/project.model';
import { ProjectConfigModel } from './models/project-config.model';
import { LicenseInfo } from './models/license-info.model';
import { ProjectsService } from './projects.service';
import { UserEntity } from '@/common/decorators/user.decorator';
import { User } from '@/users/models/user.model';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { Capability } from '@usertour/types';

@Resolver(() => Project)
@UseGuards(PermissionGuard)
export class ProjectsResolver {
  constructor(private projectsService: ProjectsService) {}

  @Query(() => ProjectConfigModel)
  @RequirePermission({ capability: Capability.ProjectRead, scope: ScopeKind.Project })
  async getProjectConfig(@Args('projectId') projectId: string) {
    return this.projectsService.getProjectConfig(projectId);
  }

  @Query(() => LicenseInfo, { nullable: true })
  @RequirePermission({ capability: Capability.BillingRead, scope: ScopeKind.Project })
  async getProjectLicenseInfo(@Args('projectId') projectId: string) {
    return this.projectsService.getProjectLicenseInfo(projectId);
  }

  @Mutation(() => Project)
  @RequirePermission({ capability: Capability.ProjectManage, scope: ScopeKind.Project })
  async updateProjectName(
    @UserEntity() user: User,
    @Args('projectId') projectId: string,
    @Args('name') name: string,
  ) {
    return this.projectsService.updateProjectName(user.id, projectId, name);
  }

  @Mutation(() => Project)
  @RequirePermission({ capability: Capability.BillingManage, scope: ScopeKind.Project })
  async updateProjectLicense(
    @UserEntity() user: User,
    @Args('projectId') projectId: string,
    @Args('license') license: string,
  ) {
    return this.projectsService.updateProjectLicense(user.id, projectId, license);
  }
}
