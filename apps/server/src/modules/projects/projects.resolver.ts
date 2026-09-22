import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { LicenseInfoDTO } from './dtos/license-info.dto';
import { ProjectDTO } from './dtos/project.dto';
import { ProjectConfigDTO } from './dtos/project-config.dto';
import { ProjectsService } from './services/projects.service';
import { UserEntity } from '@/common/decorators/user.decorator';
import { UserDTO } from '@/modules/users/dtos/user.dto';
import { AuditWeb } from '@/audit/audit.decorator';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { Capability } from '@usertour/types';

@Resolver(() => ProjectDTO)
@UseGuards(PermissionGuard)
export class ProjectsResolver {
  constructor(private projectsService: ProjectsService) {}

  @Query(() => ProjectConfigDTO)
  @RequirePermission({ capability: Capability.ProjectRead, scope: ScopeKind.Project })
  async getProjectConfig(@Args('projectId') projectId: string) {
    return this.projectsService.getProjectConfig(projectId);
  }

  @Query(() => LicenseInfoDTO, { nullable: true })
  @RequirePermission({ capability: Capability.BillingRead, scope: ScopeKind.Project })
  async getProjectLicenseInfo(@Args('projectId') projectId: string) {
    return this.projectsService.getProjectLicenseInfo(projectId);
  }

  @Mutation(() => ProjectDTO)
  @RequirePermission({ capability: Capability.ProjectManage, scope: ScopeKind.Project })
  // Same rationale as environment renames: a project rename/logo change has no
  // history anywhere else — the before snapshot is the only record.
  @AuditWeb({
    action: 'update',
    resourceType: 'project',
    resourceId: (a) => String(a.projectId),
  })
  async updateProject(
    @UserEntity() user: UserDTO,
    @Args('projectId') projectId: string,
    @Args('name', { nullable: true }) name?: string,
    @Args('logoUrl', { nullable: true }) logoUrl?: string,
  ) {
    return this.projectsService.updateProject(user.id, projectId, { name, logoUrl });
  }

  @Mutation(() => ProjectDTO)
  @RequirePermission({ capability: Capability.BillingManage, scope: ScopeKind.Project })
  // A license swap changes the project's entitlements — including the read gate
  // of the audit log itself. The license VALUE never lands in the row (it is a
  // SECRET_KEY); the entry records that it changed, by whom, when.
  @AuditWeb({
    action: 'update',
    resourceType: 'project',
    resourceId: (a) => String(a.projectId),
  })
  async updateProjectLicense(
    @UserEntity() user: UserDTO,
    @Args('projectId') projectId: string,
    @Args('license') license: string,
  ) {
    return this.projectsService.updateProjectLicense(user.id, projectId, license);
  }
}
