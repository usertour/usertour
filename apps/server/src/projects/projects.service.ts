import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { ConfigService } from '@nestjs/config';
import {
  EnvironmentLimitError,
  InvalidLicenseError,
  LicenseDecodeError,
  LicenseExpiredError,
  LicenseProjectMismatchError,
  ParamsError,
  TeamMemberLimitError,
} from '@/common/errors';
import { LicenseService } from '@/license/license.service';
import { ProjectCacheService } from '@/shared/project-cache.service';
import { Environment } from '@/common/types/schema';
import { Prisma } from '@prisma/client';
import { type PlanFeatures, PlanType, ProjectConfig } from '@usertour/types';
import { isWithinLimit, resolvePlanFeatures } from '@usertour/helpers';

type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private prisma: PrismaService,
    private licenseService: LicenseService,
    private configService: ConfigService,
    private cache: ProjectCacheService,
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
    // Memoized per request scope: a single EndBatch builds one session per
    // active content type and each session call hits this method once,
    // producing 3+ identical Project + Subscription lookups otherwise.
    return this.cache.memoize(this.cache.memoKeys.projectConfig(projectId), () => {
      const isSelfHostedMode = this.configService.get('globalConfig.isSelfHostedMode');
      if (isSelfHostedMode) {
        return this.getSelfHostedConfig(projectId);
      }
      return this.getCloudConfig(projectId);
    });
  }

  /**
   * Get configuration for self-hosted mode using license validation.
   * Priority: project license > instance license > default free/hobby.
   */
  private async getSelfHostedConfig(projectId: string): Promise<ProjectConfig> {
    const defaultConfig: ProjectConfig = {
      removeBranding: false,
      planType: PlanType.HOBBY,
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

    const planType = licensePayload?.plan || PlanType.HOBBY;
    const features = resolvePlanFeatures(planType);

    return {
      removeBranding: features.removeBranding,
      planType,
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

    const planType = payload?.plan || PlanType.HOBBY;
    const features = resolvePlanFeatures(planType);

    return {
      removeBranding: features.removeBranding,
      planType,
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
      planType: PlanType.HOBBY,
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

    const features = resolvePlanFeatures(subscription.planType, subscription.overridePlan);

    return {
      removeBranding: features.removeBranding,
      planType: subscription.planType,
    };
  }

  // ============================================================================
  // Plan quota helpers
  // ============================================================================
  //
  // Server-side counterpart to apps/web/src/hooks/use-plan-limits.ts —
  // every mutation gate that needs to enforce a plan limit calls one of
  // these, so the self-hosted bypass / subscription lookup / override
  // merge / count check / error throw all live in one place. Each
  // method accepts an optional Prisma TransactionClient so callers
  // inside a $transaction can stay in the same tx.

  async resolveProjectFeatures(
    projectId: string,
    db: DbClient = this.prisma,
  ): Promise<PlanFeatures> {
    const project = await db.project.findUnique({ where: { id: projectId } });
    const subscription = project?.subscriptionId
      ? await db.subscription.findFirst({
          where: { subscriptionId: project.subscriptionId, projectId },
        })
      : null;
    return resolvePlanFeatures(
      subscription?.planType ?? PlanType.HOBBY,
      subscription?.overridePlan,
    );
  }

  private isCloudMode(): boolean {
    return !this.configService.get('globalConfig.isSelfHostedMode');
  }

  async checkEnvironmentLimit(projectId: string, db: DbClient = this.prisma): Promise<void> {
    if (!this.isCloudMode()) return;
    const { environmentLimit } = await this.resolveProjectFeatures(projectId, db);
    const current = await db.environment.count({
      where: { projectId, deleted: false },
    });
    if (!isWithinLimit(environmentLimit, current)) {
      throw new EnvironmentLimitError();
    }
  }

  async checkTeamMemberLimit(projectId: string, db: DbClient = this.prisma): Promise<void> {
    if (!this.isCloudMode()) return;
    const { teamMemberLimit } = await this.resolveProjectFeatures(projectId, db);
    const membersCount = await db.userOnProject.count({ where: { projectId } });
    const inviteCount = await db.invite.count({
      where: { projectId, expired: false, canceled: false, deleted: false },
    });
    if (!isWithinLimit(teamMemberLimit, membersCount + inviteCount)) {
      throw new TeamMemberLimitError();
    }
  }
}
