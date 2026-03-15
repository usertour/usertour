import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SystemAdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminSettingsInfo, AdminUser, AdminProject, InstanceSetting } from './models/admin.model';
import { Project } from '@/projects/models/project.model';
import { User } from '@/users/models/user.model';

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

    return {
      instanceId: setting?.instanceId || '',
      licenseInfo,
      projectCount,
    };
  }

  @Mutation(() => InstanceSetting)
  @UseGuards(SystemAdminGuard)
  async updateInstanceLicense(@Args('license') license: string) {
    return this.adminService.updateInstanceLicense(license);
  }

  // ============================================================================
  // Users
  // ============================================================================

  @Query(() => [AdminUser])
  @UseGuards(SystemAdminGuard)
  async adminUsers() {
    return this.adminService.getAdminUsers();
  }

  @Mutation(() => User)
  @UseGuards(SystemAdminGuard)
  async updateUserSystemAdmin(
    @Args('userId') userId: string,
    @Args('isSystemAdmin') isSystemAdmin: boolean,
  ) {
    return this.adminService.updateUserSystemAdmin(userId, isSystemAdmin);
  }

  // ============================================================================
  // Projects
  // ============================================================================

  @Query(() => [AdminProject])
  @UseGuards(SystemAdminGuard)
  async adminProjects() {
    return this.adminService.getAdminProjects();
  }

  @Mutation(() => Project)
  @UseGuards(SystemAdminGuard)
  async adminCreateProject(@Args('name') name: string, @Args('ownerUserId') ownerUserId: string) {
    return this.adminService.createProject(name, ownerUserId);
  }
}
