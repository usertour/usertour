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
  async updateProject(
    @UserEntity() user: User,
    @Args('projectId') projectId: string,
    @Args('name', { nullable: true }) name?: string,
    @Args('logoUrl', { nullable: true }) logoUrl?: string,
  ) {
    return this.projectsService.updateProject(user.id, projectId, { name, logoUrl });
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
