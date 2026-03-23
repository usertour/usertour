import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import {
  ParamsError,
  InvalidLicenseError,
  LicenseExpiredError,
  LicenseProjectMismatchError,
  LicenseDecodeError,
} from '@/common/errors';
import { LicenseService } from '@/license/license.service';
import { Environment } from '@/common/types/schema';
import { ProjectConfig } from '@usertour/types';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private prisma: PrismaService,
    private licenseService: LicenseService,
    private configService: ConfigService,
  ) {}

  async getUserProject(userId: string, projectId: string) {
    if (!userId || !projectId) {
      return null;
    }
    return await this.prisma.userOnProject.findFirst({
      where: { userId, projectId },
    });
  }

  async getProject(projectId: string) {
    return await this.prisma.project.findUnique({
      where: { id: projectId },
    });
  }

  async getProjectLicenseInfo(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || !project.license) {
      return null;
    }

    try {
      const validationResult = await this.licenseService.validateLicense(project.license);
      const payload = await this.licenseService.getLicensePayload(project.license);
      const expirationInfo = await this.licenseService.getExpirationInfo(project.license);

      return {
        payload: payload,
        isValid: validationResult.isValid,
        isExpired: expirationInfo?.isExpired || false,
        error: validationResult.error || null,
        daysRemaining: expirationInfo?.daysUntilExpiration || null,
      };
    } catch {
      return null;
    }
  }

  async updateProjectName(userId: string, projectId: string, name: string) {
    // Check if user has access to the project
    const userProject = await this.getUserProject(userId, projectId);
    if (!userProject) {
      throw new ParamsError('Project not found or no access');
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { name },
    });
  }

  async updateProjectLicense(userId: string, projectId: string, license: string) {
    // Check if user has access to the project
    const userProject = await this.getUserProject(userId, projectId);
    if (!userProject) {
      throw new ParamsError('Project not found or no access');
    }

    // Validate license
    const validationResult = await this.licenseService.validateLicense(license);
    if (!validationResult.isValid) {
      throw new InvalidLicenseError();
    }

    // Get license payload to check plan type
    const licensePayload = await this.licenseService.getLicensePayload(license);
    if (!licensePayload) {
      throw new LicenseDecodeError();
    }

    // Ensure this is a project-scope license
    const scope = licensePayload.scope || (licensePayload.projectId ? 'project' : 'project');
    if (scope !== 'project') {
      throw new InvalidLicenseError();
    }

    // Check if license projectId matches the target project
    if (licensePayload.projectId !== projectId) {
      throw new LicenseProjectMismatchError();
    }

    // Check if license is expired
    const expirationInfo = await this.licenseService.getExpirationInfo(license);
    if (expirationInfo?.isExpired) {
      throw new LicenseExpiredError();
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { license },
    });
  }

  // ============================================================================
  // Project Configuration Methods
  // ============================================================================

  /**
   * Get configuration settings based on environment
   * @param environment - Environment context
   * @returns Configuration object with plan type and branding settings
   */
  async getConfig(environment: Environment): Promise<ProjectConfig> {
    return this.getProjectConfig(environment.projectId);
  }

  async getProjectConfig(projectId: string): Promise<ProjectConfig> {
    const isSelfHostedMode = this.configService.get('globalConfig.isSelfHostedMode');

    if (isSelfHostedMode) {
      return await this.getSelfHostedConfig(projectId);
    }

    return await this.getCloudConfig(projectId);
  }

  /**
   * Get configuration for self-hosted mode using license validation.
   * Priority: project license > instance license > default free/hobby.
   */
  private async getSelfHostedConfig(projectId: string): Promise<ProjectConfig> {
    const defaultConfig: ProjectConfig = {
      removeBranding: false,
      planType: 'hobby',
    };
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    // Try project-level license first
    const projectConfig = await this.tryProjectLicense(project?.license, projectId);
    if (projectConfig) {
      return projectConfig;
    }

    // Fallback to instance-level license
    const instanceConfig = await this.tryInstanceLicense(project?.usesInstanceLicense ?? false);
    if (instanceConfig) {
      return instanceConfig;
    }

    return defaultConfig;
  }

  /**
   * Try to resolve config from a project-level license.
   */
  private async tryProjectLicense(
    licenseToken: string | null | undefined,
    projectId: string,
  ): Promise<ProjectConfig | null> {
    if (!licenseToken) {
      return null;
    }

    const validationResult = await this.licenseService.validateLicense(licenseToken);
    if (!validationResult.isValid) {
      return null;
    }

    const licensePayload = await this.licenseService.getLicensePayload(licenseToken);

    // Check scope: legacy (no scope + projectId) or explicit project scope
    const scope = licensePayload?.scope || (licensePayload?.projectId ? 'project' : null);
    if (scope !== 'project') {
      return null;
    }

    // Check if license projectId matches
    if (licensePayload?.projectId !== projectId) {
      this.logger.warn(
        `License projectId mismatch. Expected: ${projectId}, Got: ${licensePayload?.projectId}`,
      );
      return null;
    }

    const isBusinessPlan =
      licensePayload?.plan === 'business' || licensePayload?.plan === 'enterprise';

    return {
      removeBranding: isBusinessPlan,
      planType: licensePayload?.plan || 'hobby',
    };
  }

  /**
   * Try to resolve config from the instance-level license.
   */
  private async tryInstanceLicense(usesInstanceLicense: boolean): Promise<ProjectConfig | null> {
    const instanceSetting = await this.prisma.instanceSetting.findUnique({
      where: { key: 'instance' },
    });
    if (!instanceSetting?.license) {
      return null;
    }

    const validationResult = await this.licenseService.validateLicense(instanceSetting.license);
    if (!validationResult.isValid) {
      return null;
    }

    const payload = await this.licenseService.getLicensePayload(instanceSetting.license);
    const scope = payload?.scope || (payload?.projectId ? 'project' : 'instance');
    if (scope !== 'instance') {
      return null;
    }

    if (payload?.instanceId !== instanceSetting.instanceId) {
      return null;
    }

    const isUnlimited = payload?.projectLimit === null || payload?.projectLimit === undefined;
    if (!isUnlimited && !usesInstanceLicense) {
      return null;
    }

    const isBusinessPlan = payload?.plan === 'business' || payload?.plan === 'enterprise';

    return {
      removeBranding: isBusinessPlan,
      planType: payload?.plan || 'hobby',
    };
  }

  /**
   * Get configuration for cloud mode using subscription-based logic
   * @param environment - Environment context
   * @returns Configuration object with plan type and branding settings
   */
  private async getCloudConfig(projectId: string): Promise<ProjectConfig> {
    const defaultConfig: ProjectConfig = {
      removeBranding: false,
      planType: 'hobby',
    };

    // Cloud mode: use subscription-based logic
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project?.subscriptionId) {
      return defaultConfig;
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { subscriptionId: project.subscriptionId },
    });

    if (!subscription) {
      return defaultConfig;
    }

    return {
      removeBranding: subscription.planType !== 'hobby',
      planType: subscription.planType,
    };
  }
}
