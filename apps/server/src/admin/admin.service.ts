import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { createHash, randomBytes } from 'node:crypto';
import { LicenseService } from '@/license/license.service';
import {
  EmailAlreadyRegistered,
  InvalidLicenseError,
  LicenseExpiredError,
  ParamsError,
} from '@/common/errors';
import {
  getDefaultSegments,
  initialization,
  initializationThemes,
} from '@/common/initialization/initialization';
import { RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { PasswordService } from '@/auth/password.service';
import { Role } from '@prisma/client';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private licenseService: LicenseService,
    private passwordService: PasswordService,
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

  async getAdminUsers(query?: string, page = 1, pageSize = 20) {
    const where: any = {};
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          projects: {
            select: { id: true },
          },
        },
      }),
    ]);

    return {
      items: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        isSystemAdmin: user.isSystemAdmin,
        disabled: user.disabled,
        projectCount: user.projects.length,
      })),
      total,
      page,
      pageSize,
    };
  }

  async createUser(name: string, email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new EmailAlreadyRegistered();
    }

    const hashedPassword = await this.passwordService.hashPassword(password);
    return this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isSystemAdmin: false,
        disabled: false,
      },
    });
  }

  async updateUserDisabled(userId: string, disabled: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ParamsError('User not found');
    }

    // Prevent disabling the last system admin
    if (user.isSystemAdmin && disabled) {
      const systemAdminCount = await this.prisma.user.count({
        where: { isSystemAdmin: true, disabled: false },
      });
      if (systemAdminCount <= 1) {
        throw new ParamsError('Cannot disable the last system admin');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { disabled },
    });
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

  async getAdminProjects(query?: string, page = 1, pageSize = 20) {
    const where: any = {};
    if (query) {
      where.name = { contains: query, mode: 'insensitive' };
    }

    const [total, projects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          users: {
            include: { user: true },
          },
        },
      }),
    ]);

    const instanceSetting = await this.prisma.instanceSetting.findFirst();

    const items = await Promise.all(
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

    return { items, total, page, pageSize };
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

  // ============================================================================
  // Project Members Management
  // ============================================================================

  async getProjectMembers(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new ParamsError('Project not found');
    }

    const members = await this.prisma.userOnProject.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user?.name || null,
      email: m.user?.email || null,
      role: m.role,
      isOwner: m.role === Role.OWNER,
    }));
  }

  async addProjectMember(projectId: string, userId: string, role: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new ParamsError('Project not found');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ParamsError('User not found');
    }
    if (user.disabled) {
      throw new ParamsError('Cannot add a disabled user to project');
    }

    if (role !== Role.ADMIN && role !== Role.VIEWER) {
      throw new ParamsError('Invalid project member role');
    }

    const existingMember = await this.prisma.userOnProject.findFirst({
      where: { userId, projectId },
    });
    if (existingMember) {
      throw new ParamsError('User is already a member of this project');
    }

    return this.prisma.userOnProject.create({
      data: {
        userId,
        projectId,
        role: role as Role,
        actived: false,
      },
    });
  }

  async changeProjectMemberRole(projectId: string, userId: string, role: string) {
    const userOnProject = await this.prisma.userOnProject.findFirst({
      where: { userId, projectId },
    });
    if (!userOnProject) {
      throw new ParamsError('Member not found in project');
    }

    return this.prisma.$transaction(async (tx) => {
      if (role === Role.OWNER) {
        await tx.userOnProject.updateMany({
          where: { projectId, role: Role.OWNER },
          data: { role: Role.ADMIN },
        });
      }
      return tx.userOnProject.update({
        where: { id: userOnProject.id },
        data: { role: role as Role },
      });
    });
  }

  async transferProjectOwnership(projectId: string, userId: string) {
    return this.changeProjectMemberRole(projectId, userId, Role.OWNER);
  }

  async removeProjectMember(projectId: string, userId: string) {
    const userOnProject = await this.prisma.userOnProject.findFirst({
      where: { userId, projectId },
    });
    if (!userOnProject) {
      throw new ParamsError('Member not found in project');
    }
    if (userOnProject.role === Role.OWNER) {
      throw new ParamsError('Cannot remove the project owner');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.userOnProject.delete({ where: { id: userOnProject.id } });
      // If the member was active in this project, activate another project
      if (userOnProject.actived) {
        const other = await tx.userOnProject.findFirst({ where: { userId } });
        if (other) {
          await tx.userOnProject.update({
            where: { id: other.id },
            data: { actived: true },
          });
        }
      }
      return true;
    });
  }
}
