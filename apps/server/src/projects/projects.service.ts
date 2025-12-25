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
        license: project.license,
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
    const isSelfHostedMode = this.configService.get('globalConfig.isSelfHostedMode');

    if (isSelfHostedMode) {
      return await this.getSelfHostedConfig(environment);
    }

    return await this.getCloudConfig(environment);
  }

  /**
   * Get configuration for self-hosted mode using license validation
   * @param environment - Environment context
   * @returns Configuration object with plan type and branding settings
   */
  private async getSelfHostedConfig(environment: Environment): Promise<ProjectConfig> {
    const defaultConfig: ProjectConfig = {
      removeBranding: false,
      planType: 'hobby',
    };
    const project = await this.prisma.project.findUnique({
      where: { id: environment.projectId },
    });

    // Self-hosted mode: use license validation
    const licenseToken = project?.license;
    if (!licenseToken) {
      return defaultConfig;
    }

    const validationResult = await this.licenseService.validateLicense(licenseToken);

    if (validationResult.isValid) {
      const licensePayload = await this.licenseService.getLicensePayload(licenseToken);

      // Check if license projectId matches the current project
      if (licensePayload?.projectId !== environment.projectId) {
        this.logger.warn(
          `License projectId mismatch. Expected: ${environment.projectId}, Got: ${licensePayload?.projectId}`,
        );
        return defaultConfig;
      }

      const isBusinessPlan =
        licensePayload?.plan === 'business' || licensePayload?.plan === 'enterprise';

      return {
        removeBranding: isBusinessPlan,
        planType: licensePayload?.plan || 'hobby',
      };
    }

    return defaultConfig;
  }

  /**
   * Get configuration for cloud mode using subscription-based logic
   * @param environment - Environment context
   * @returns Configuration object with plan type and branding settings
   */
  private async getCloudConfig(environment: Environment): Promise<ProjectConfig> {
    const defaultConfig: ProjectConfig = {
      removeBranding: false,
      planType: 'hobby',
    };

    // Cloud mode: use subscription-based logic
    const project = await this.prisma.project.findUnique({
      where: { id: environment.projectId },
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
