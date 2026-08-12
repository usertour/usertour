import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuditWeb } from '@/audit/audit.decorator';
import { SystemAdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import {
  AdminSettingsInfo,
  AdminUserList,
  AdminProjectList,
  AdminProjectMember,
  InstanceSetting,
} from './models/admin.model';
import { Project } from '@/projects/models/project.model';
import { User } from '@/users/models/user.model';
import { UserEntity } from '@/common/decorators/user.decorator';

@Resolver()
export class AdminResolver {
  constructor(private adminService: AdminService) {}

  // ============================================================================
  // Settings
  // ============================================================================

  @Query(() => AdminSettingsInfo)
  @UseGuards(SystemAdminGuard)
  async adminSettings() {
    const setting = await this.adminService.getInstanceSetting();
    const licenseInfo = await this.adminService.getInstanceLicenseInfo();
    const projectCount = await this.adminService.getProjectCount();
    const projectsUsingInstanceLicense =
      await this.adminService.getProjectsUsingInstanceLicenseCount();
    const isOverProjectLimit = await this.adminService.isOverProjectLimit();

    return {
      instanceId: setting?.instanceId || '',
      licenseInfo,
      projectCount,
      projectsUsingInstanceLicense,
      isOverProjectLimit,
    };
  }

  @Query(() => InstanceSetting)
  @UseGuards(SystemAdminGuard)
  async adminInstanceSettings() {
    return this.adminService.getOrCreateInstanceSetting();
  }

  @Mutation(() => InstanceSetting)
  @UseGuards(SystemAdminGuard)
  async updateInstanceLicense(@Args('license') license: string) {
    return this.adminService.updateInstanceLicense(license);
  }

  @Mutation(() => InstanceSetting)
  @UseGuards(SystemAdminGuard)
  async updateInstanceGeneralSettings(
    @Args('name', { nullable: true }) name?: string,
    @Args('contactEmail', { nullable: true }) contactEmail?: string,
    @Args('allowProjectLevelSubscriptionManagement', { nullable: true })
    allowProjectLevelSubscriptionManagement?: boolean,
  ) {
    return this.adminService.updateInstanceGeneralSettings(
      name,
      contactEmail,
      allowProjectLevelSubscriptionManagement,
    );
  }

  @Mutation(() => InstanceSetting)
  @UseGuards(SystemAdminGuard)
  async updateInstanceAuthenticationSettings(
    @Args('allowUserRegistration') allowUserRegistration: boolean,
  ) {
    return this.adminService.updateInstanceAuthenticationSettings(allowUserRegistration);
  }

  @Mutation(() => InstanceSetting)
  @UseGuards(SystemAdminGuard)
  async updateInstanceRequire2FA(@UserEntity() user: User, @Args('value') value: boolean) {
    return this.adminService.updateInstanceRequire2FA(user.id, value);
  }

  // ============================================================================
  // Users
  // ============================================================================

  @Query(() => AdminUserList)
  @UseGuards(SystemAdminGuard)
  async adminUsers(
    @Args('query', { nullable: true }) query?: string,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('pageSize', { type: () => Int, nullable: true }) pageSize?: number,
    @Args('status', { nullable: true }) status?: string,
    @Args('role', { nullable: true }) role?: string,
  ) {
    return this.adminService.getAdminUsers(query, page || 1, pageSize || 20, status, role);
  }

  @Mutation(() => User)
  @UseGuards(SystemAdminGuard)
  async adminCreateUser(
    @Args('name') name: string,
    @Args('email') email: string,
    @Args('password') password: string,
  ) {
    return this.adminService.createUser(name, email, password);
  }

  @Mutation(() => User)
  @UseGuards(SystemAdminGuard)
  async updateUserSystemAdmin(
    @Args('userId') userId: string,
    @Args('isSystemAdmin') isSystemAdmin: boolean,
  ) {
    return this.adminService.updateUserSystemAdmin(userId, isSystemAdmin);
  }

  @Mutation(() => User)
  @UseGuards(SystemAdminGuard)
  async updateUserDisabled(@Args('userId') userId: string, @Args('disabled') disabled: boolean) {
    return this.adminService.updateUserDisabled(userId, disabled);
  }

  // ============================================================================
  // Projects
  // ============================================================================

  @Query(() => AdminProjectList)
  @UseGuards(SystemAdminGuard)
  async adminProjects(
    @Args('query', { nullable: true }) query?: string,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('pageSize', { type: () => Int, nullable: true }) pageSize?: number,
    @Args('usesInstanceLicense', { nullable: true }) usesInstanceLicense?: string,
  ) {
    return this.adminService.getAdminProjects(
      query,
      page || 1,
      pageSize || 20,
      usesInstanceLicense,
    );
  }

  @Mutation(() => Project)
  @UseGuards(SystemAdminGuard)
  async adminCreateProject(@Args('name') name: string, @Args('ownerUserId') ownerUserId: string) {
    return this.adminService.createProject(name, ownerUserId);
  }

  @Mutation(() => Boolean)
  @UseGuards(SystemAdminGuard)
  async updateProjectUsesInstanceLicense(
    @Args('projectId') projectId: string,
    @Args('enabled') enabled: boolean,
  ) {
    return this.adminService.updateProjectUsesInstanceLicense(projectId, enabled);
  }

  // ============================================================================
  // Project Members
  // ============================================================================

  @Query(() => [AdminProjectMember])
  @UseGuards(SystemAdminGuard)
  async adminProjectMembers(@Args('projectId') projectId: string) {
    return this.adminService.getProjectMembers(projectId);
  }

  // The four admin member mutations change the same roster as the audited
  // team.resolver ones — the instance admin must not be the one actor whose
  // changes leave no trace. SystemAdminGuard stashes no projectId (it is not
  // PermissionGuard), so each meta resolves the project from its own args.
  @Mutation(() => Boolean)
  @UseGuards(SystemAdminGuard)
  @AuditWeb({
    action: 'create',
    resourceType: 'member',
    resourceId: (a) => String(a.userId),
    resolveProjectId: async (a) => String(a.projectId),
  })
  async adminAddProjectMember(
    @Args('projectId') projectId: string,
    @Args('userId') userId: string,
    @Args('role') role: string,
  ) {
    await this.adminService.addProjectMember(projectId, userId, role);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(SystemAdminGuard)
  @AuditWeb({
    action: 'update',
    resourceType: 'member',
    resourceId: (a) => String(a.userId),
    resolveProjectId: async (a) => String(a.projectId),
  })
  async adminChangeProjectMemberRole(
    @Args('projectId') projectId: string,
    @Args('userId') userId: string,
    @Args('role') role: string,
  ) {
    await this.adminService.changeProjectMemberRole(projectId, userId, role);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(SystemAdminGuard)
  @AuditWeb({
    action: 'update',
    resourceType: 'member',
    resourceId: (a) => String(a.userId),
    resolveProjectId: async (a) => String(a.projectId),
  })
  async adminTransferProjectOwnership(
    @Args('projectId') projectId: string,
    @Args('userId') userId: string,
  ) {
    await this.adminService.transferProjectOwnership(projectId, userId);
    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(SystemAdminGuard)
  @AuditWeb({
    action: 'delete',
    resourceType: 'member',
    resourceId: (a) => String(a.userId),
    resolveProjectId: async (a) => String(a.projectId),
  })
  async adminRemoveProjectMember(
    @Args('projectId') projectId: string,
    @Args('userId') userId: string,
  ) {
    await this.adminService.removeProjectMember(projectId, userId);
    return true;
  }
}
