import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { createHash, randomBytes } from 'node:crypto';
import { LicenseService } from '@/license/license.service';
import { InvalidLicenseError, LicenseExpiredError, ParamsError } from '@/common/errors';
import {
  getDefaultSegments,
  initialization,
  initializationThemes,
} from '@/common/initialization/initialization';
import { RolesScopeEnum } from '@/common/decorators/roles.decorator';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private licenseService: LicenseService,
  ) {}

  async onModuleInit() {
    const isSelfHostedMode = this.configService.get('globalConfig.isSelfHostedMode');
    if (isSelfHostedMode) {
      await this.ensureInstanceSetting();
    }
  }

  /**
   * Ensure exactly one InstanceSetting record exists with a stable instanceId.
   */
  private async ensureInstanceSetting() {
    const existing = await this.prisma.instanceSetting.findFirst();
    if (!existing) {
      const instanceId = this.generateInstanceId();
      await this.prisma.instanceSetting.create({
        data: { instanceId },
      });
      this.logger.log(`Created instance setting with instanceId: ${instanceId}`);
    }
  }

  /**
   * Generate a stable instance ID based on a random seed.
   */
  private generateInstanceId(): string {
    const seed = randomBytes(32).toString('hex');
    return createHash('sha256').update(seed).digest('hex').substring(0, 32);
  }

  // ============================================================================
  // Instance Settings
  // ============================================================================

  async getInstanceSetting() {
    return this.prisma.instanceSetting.findFirst();
  }

  async getInstanceLicenseInfo() {
    const setting = await this.prisma.instanceSetting.findFirst();
    if (!setting?.license) {
      return null;
    }

    try {
      const validationResult = await this.licenseService.validateLicense(setting.license);
      const payload = await this.licenseService.getLicensePayload(setting.license);
      const expirationInfo = await this.licenseService.getExpirationInfo(setting.license);

      // Instance license must have instance scope
      const scope = payload?.scope || (payload?.projectId ? 'project' : 'instance');
      if (scope !== 'instance') {
        return {
          license: setting.license,
          payload,
          isValid: false,
          isExpired: false,
          error: 'License is not an instance-scope license',
          daysRemaining: null,
        };
      }

      // Validate instanceId matches
      if (payload?.instanceId !== setting.instanceId) {
        return {
          license: setting.license,
          payload,
          isValid: false,
          isExpired: false,
          error: 'License instanceId does not match this instance',
          daysRemaining: null,
        };
      }

      return {
        license: setting.license,
        payload,
        isValid: validationResult.isValid,
        isExpired: expirationInfo?.isExpired || false,
        error: validationResult.error || null,
        daysRemaining: expirationInfo?.daysUntilExpiration || null,
      };
    } catch {
      return null;
    }
  }

  async updateInstanceLicense(license: string) {
    const setting = await this.prisma.instanceSetting.findFirst();
    if (!setting) {
      throw new ParamsError('Instance setting not found');
    }

    // Validate license
    const validationResult = await this.licenseService.validateLicense(license);
    if (!validationResult.isValid) {
      throw new InvalidLicenseError();
    }

    const payload = await this.licenseService.getLicensePayload(license);
    if (!payload) {
      throw new InvalidLicenseError();
    }

    // Must be instance scope
    const scope =
      payload.scope || (payload.projectId && !payload.instanceId ? 'project' : 'instance');
    if (scope !== 'instance') {
      throw new InvalidLicenseError();
    }

    // Must match our instanceId
    if (payload.instanceId !== setting.instanceId) {
      throw new ParamsError('License instanceId does not match this instance');
    }

    // Check expiration
    const expirationInfo = await this.licenseService.getExpirationInfo(license);
    if (expirationInfo?.isExpired) {
      throw new LicenseExpiredError();
    }

    return this.prisma.instanceSetting.update({
      where: { id: setting.id },
      data: { license },
    });
  }

  // ============================================================================
  // Users Management
  // ============================================================================

  async getAdminUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        projects: {
          select: { id: true },
        },
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      isSystemAdmin: user.isSystemAdmin,
      projectCount: user.projects.length,
    }));
  }

  async updateUserSystemAdmin(userId: string, isSystemAdmin: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ParamsError('User not found');
    }

    if (user.isSystemAdmin && !isSystemAdmin) {
      const systemAdminCount = await this.prisma.user.count({
        where: { isSystemAdmin: true },
      });

      if (systemAdminCount <= 1) {
        throw new ParamsError('Cannot revoke the last system admin');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isSystemAdmin },
    });
  }

  // ============================================================================
  // Projects Management
  // ============================================================================

  async getAdminProjects() {
    const projects = await this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          include: { user: true },
        },
      },
    });

    const instanceSetting = await this.prisma.instanceSetting.findFirst();

    return Promise.all(
      projects.map(async (project) => {
        const owner = project.users.find((u) => u.role === 'OWNER');
        const licenseSource = await this.resolveProjectLicenseSource(project, instanceSetting);

        return {
          id: project.id,
          name: project.name,
          createdAt: project.createdAt,
          ownerName: owner?.user?.name || null,
          ownerEmail: owner?.user?.email || null,
          memberCount: project.users.length,
          licenseSource,
        };
      }),
    );
  }

  private async resolveProjectLicenseSource(
    project: { id: string; license: string | null },
    instanceSetting: { instanceId: string; license: string | null } | null,
  ): Promise<string> {
    // Check project-level license first
    if (project.license) {
      const result = await this.licenseService.validateLicense(project.license);
      if (result.isValid) {
        const payload = await this.licenseService.getLicensePayload(project.license);
        if (payload?.projectId === project.id) {
          return 'project';
        }
      }
    }

    // Check instance-level license
    if (instanceSetting?.license) {
      const result = await this.licenseService.validateLicense(instanceSetting.license);
      if (result.isValid) {
        const payload = await this.licenseService.getLicensePayload(instanceSetting.license);
        const scope = payload?.scope || (payload?.projectId ? 'project' : 'instance');
        if (scope === 'instance' && payload?.instanceId === instanceSetting.instanceId) {
          return 'instance';
        }
      }
    }

    return 'none';
  }

  async createProject(name: string, ownerUserId: string) {
    const owner = await this.prisma.user.findUnique({ where: { id: ownerUserId } });
    if (!owner) {
      throw new ParamsError('Owner user not found');
    }

    const project = await this.prisma.project.create({
      data: {
        name,
        users: {
          create: [{ userId: ownerUserId, role: RolesScopeEnum.OWNER, actived: false }],
        },
        segments: {
          create: getDefaultSegments(),
        },
        environments: {
          create: [
            {
              name: 'Production',
              isPrimary: true,
            },
          ],
        },
        themes: { create: [...initializationThemes] },
        localizations: {
          create: [
            {
              locale: 'en-US',
              name: 'English',
              code: 'en-US',
              isDefault: true,
            },
          ],
        },
      },
      include: {
        environments: true,
      },
    });

    // Initialize project (attributes, etc.)
    await initialization(this.prisma, project.id);

    return project;
  }

  // ============================================================================
  // Project Count
  // ============================================================================

  async getProjectCount(): Promise<number> {
    return this.prisma.project.count();
  }
}
