import { Attribute, AttributeBizType } from '@/attributes/models/attribute.model';
import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import { createConditionsFilter } from '@/common/attribute/filter';
import { evaluateAttributeCondition } from '@usertour/helpers';
import { Injectable, Logger } from '@nestjs/common';
import {
  BizUser,
  Environment,
  Step,
  Theme,
  Version,
  VersionWithStepsAndContent,
  BizSessionWithEvents,
} from '@/common/types/schema';
import { PrismaService } from 'nestjs-prisma';
import {
  BizEvents,
  ContentConfigObject,
  RulesCondition,
  ChecklistData,
  ContentDataType,
  ContentConditionLogic,
  RulesType,
  ProjectConfig,
  RulesEvaluationOptions,
} from '@usertour/types';
import { getPublishedVersionId, flowIsDismissed, checklistIsDimissed } from '@/utils/content-utils';
import { CustomContentVersion, ContentSessionCollection } from '@/common/types/content';
import { ConfigService } from '@nestjs/config';
import { LicenseService } from '@/license/license.service';

type SegmentDataItem = {
  data: {
    logic: string;
    attrId: string;
  };
  type: 'user-attr';
  operators: 'and' | 'or';
};

@Injectable()
export class DataResolverService {
  private readonly logger = new Logger(DataResolverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly licenseService: LicenseService,
  ) {}

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Fetch custom content versions for a user with optimized performance
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param externalCompanyId - The external company ID
   * @param versionId - Optional specific version ID
   * @returns Array of custom content versions
   */
  async fetchCustomContentVersions(
    environment: Environment,
    externalUserId: string,
    externalCompanyId?: string,
    versionId?: string,
  ): Promise<CustomContentVersion[]> {
    try {
      const { bizUser, attributes } = await this.getUserAndAttributes(environment, externalUserId);
      if (!bizUser) {
        return [];
      }

      const versions = await this.getVersions(environment, versionId);
      if (versions.length === 0) {
        return [];
      }

      // Batch fetch session statistics for all contents
      const contentSessionMap = await this.getBatchContentSession(
        versions.map((v) => v.content.id),
        bizUser.id,
      );

      // Process all versions in parallel
      const processedVersions = await Promise.all(
        versions.map(async (version) => {
          return await this.processContentOptimized(
            version,
            environment,
            bizUser,
            attributes,
            contentSessionMap.get(version.content.id),
            String(externalCompanyId),
          );
        }),
      );

      return processedVersions.filter(Boolean);
    } catch (error) {
      this.logger.error({
        message: `Error in fetchCustomContentVersions: ${error.message}`,
        stack: error.stack,
      });
      return [];
    }
  }

  /**
   * Fetch themes for a user with optimized performance
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param externalCompanyId - The external company ID
   * @returns Array of themes
   */
  async fetchThemes(
    environment: Environment,
    externalUserId: string,
    externalCompanyId?: string,
  ): Promise<Theme[]> {
    const bizUser = await this.prisma.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId: environment.id },
    });

    const themes = await this.prisma.theme.findMany({
      where: { projectId: environment.projectId },
    });

    // Return empty array if no themes found
    if (!themes || themes.length === 0) {
      return [];
    }

    // If no bizUser, return themes as-is without processing conditions
    if (!bizUser) {
      return themes;
    }

    const attributes = await this.prisma.attribute.findMany({
      where: {
        projectId: environment.projectId,
        bizType: {
          in: [AttributeBizType.USER, AttributeBizType.COMPANY, AttributeBizType.MEMBERSHIP],
        },
      },
    });

    const processedThemes = await Promise.all(
      themes.map(async (theme) => {
        // Check if variations is an array, if not return theme as-is
        const variations = theme.variations as any[];
        if (!Array.isArray(variations)) {
          return theme;
        }

        // Process each variation's conditions
        const processedVariations = await Promise.all(
          variations.map(async (variation: any) => {
            const processedConditions = variation.conditions
              ? await this.evaluateRulesConditions(
                  variation.conditions,
                  environment,
                  attributes,
                  bizUser,
                  String(externalCompanyId),
                )
              : [];

            return {
              ...variation,
              conditions: processedConditions,
            };
          }),
        );

        return {
          ...theme,
          variations: processedVariations,
        };
      }),
    );

    return processedThemes;
  }

  /**
   * Find published content version ID by contentId and environmentId
   * @param contentId - The content ID
   * @param environmentId - The environment ID
   * @returns Published version ID or null if not found
   */
  async findPublishedContentVersionId(
    contentId: string,
    environmentId: string,
  ): Promise<string | null> {
    const contentOnEnvironment = await this.prisma.contentOnEnvironment.findFirst({
      where: {
        environmentId,
        contentId,
        published: true,
      },
      select: {
        publishedVersionId: true,
      },
    });

    return contentOnEnvironment?.publishedVersionId || null;
  }

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

  // ============================================================================
  // Configuration Methods
  // ============================================================================

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

  // ============================================================================
  // Data Retrieval Methods
  // ============================================================================

  /**
   * Get user and attributes for content processing
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @returns Object containing bizUser and attributes
   */
  private async getUserAndAttributes(
    environment: Environment,
    externalUserId: string,
  ): Promise<{ bizUser: BizUser | null; attributes: Attribute[] }> {
    const environmentId = environment.id;
    const projectId = environment.projectId;

    const [bizUser, attributes] = await Promise.all([
      this.prisma.bizUser.findFirst({
        where: { externalId: String(externalUserId), environmentId },
      }),
      this.prisma.attribute.findMany({
        where: {
          projectId,
          bizType: {
            in: [AttributeBizType.USER, AttributeBizType.COMPANY, AttributeBizType.MEMBERSHIP],
          },
        },
      }),
    ]);

    return { bizUser, attributes };
  }

  /**
   * Get versions for content processing
   * @param environment - The environment
   * @param versionId - Optional specific version ID
   * @returns Array of versions with content and steps
   */
  private async getVersions(
    environment: Environment,
    versionId?: string,
  ): Promise<VersionWithStepsAndContent[]> {
    if (versionId) {
      // Get the specific version with content
      const version = await this.prisma.version.findFirst({
        where: {
          id: versionId,
        },
        include: {
          content: true,
          steps: { orderBy: { sequence: 'asc' } },
        },
      });

      return version ? [version] : [];
    }

    // Get all published versions with content
    const publishedContents = await this.prisma.content.findMany({
      where: {
        contentOnEnvironments: {
          some: {
            environmentId: environment.id,
            published: true,
          },
        },
      },
      include: {
        contentOnEnvironments: true,
      },
    });

    // Get version IDs for published contents
    const versionIds = publishedContents
      .map((content) => getPublishedVersionId(content, environment.id))
      .filter(Boolean);

    // Get versions with content and steps
    return await this.prisma.version.findMany({
      where: { id: { in: versionIds } },
      include: {
        content: true,
        steps: { orderBy: { sequence: 'asc' } },
      },
    });
  }

  /**
   * Get session statistics for multiple contents in batch
   * @param contentIds - Array of content IDs
   * @param bizUserId - The ID of the business user
   * @returns Map of content ID to session statistics
   */
  private async getBatchContentSession(
    contentIds: string[],
    bizUserId: string,
  ): Promise<Map<string, ContentSessionCollection>> {
    const contentSessionMap = new Map<string, ContentSessionCollection>();

    // Batch fetch latest sessions for all contents using distinct
    const latestSessions = await this.prisma.bizSession.findMany({
      where: {
        contentId: { in: contentIds },
        bizUserId,
        deleted: false,
      },
      include: { bizEvent: { include: { event: true } } },
      orderBy: { createdAt: 'desc' },
      distinct: ['contentId'],
    });

    // Batch fetch session counts
    const [totalSessions, dismissedSessions, completedSessions, seenSessions] = await Promise.all([
      this.prisma.bizSession.groupBy({
        by: ['contentId'],
        where: {
          contentId: { in: contentIds },
          bizUserId,
          deleted: false,
        },
        _count: { id: true },
      }),
      this.prisma.bizSession.groupBy({
        by: ['contentId'],
        where: {
          contentId: { in: contentIds },
          bizUserId,
          deleted: false,
          bizEvent: {
            some: {
              event: {
                codeName: {
                  in: [
                    BizEvents.FLOW_ENDED,
                    BizEvents.LAUNCHER_DISMISSED,
                    BizEvents.CHECKLIST_DISMISSED,
                  ],
                },
              },
            },
          },
        },
        _count: { id: true },
      }),
      this.prisma.bizSession.groupBy({
        by: ['contentId'],
        where: {
          contentId: { in: contentIds },
          bizUserId,
          deleted: false,
          bizEvent: {
            some: {
              event: {
                codeName: {
                  in: [
                    BizEvents.FLOW_COMPLETED,
                    BizEvents.LAUNCHER_ACTIVATED,
                    BizEvents.CHECKLIST_COMPLETED,
                  ],
                },
              },
            },
          },
        },
        _count: { id: true },
      }),
      this.prisma.bizSession.groupBy({
        by: ['contentId'],
        where: {
          contentId: { in: contentIds },
          bizUserId,
          deleted: false,
          bizEvent: {
            some: {
              event: {
                codeName: {
                  in: [BizEvents.FLOW_STEP_SEEN, BizEvents.CHECKLIST_SEEN],
                },
              },
            },
          },
        },
        _count: { id: true },
      }),
    ]);

    // Create maps for quick lookup
    const totalMap = new Map(totalSessions.map((s) => [s.contentId, s._count.id]));
    const dismissedMap = new Map(dismissedSessions.map((s) => [s.contentId, s._count.id]));
    const completedMap = new Map(completedSessions.map((s) => [s.contentId, s._count.id]));
    const seenMap = new Map(seenSessions.map((s) => [s.contentId, s._count.id]));

    // Build statistics for each content
    for (const contentId of contentIds) {
      const latestSession =
        latestSessions.find((session) => session.contentId === contentId) || null;

      contentSessionMap.set(contentId, {
        contentId,
        latestSession,
        totalSessions: totalMap.get(contentId) || 0,
        dismissedSessions: dismissedMap.get(contentId) || 0,
        completedSessions: completedMap.get(contentId) || 0,
        seenSessions: seenMap.get(contentId) || 0,
      });
    }

    return contentSessionMap;
  }

  /**
   * Get the latest session for a content and user
   * @param contentId - The ID of the content
   * @param bizUserId - The ID of the business user
   * @returns The latest session
   */
  private async getLatestSession(
    contentId: string,
    bizUserId: string,
  ): Promise<BizSessionWithEvents | null> {
    return await this.prisma.bizSession.findFirst({
      where: { contentId, bizUserId, deleted: false },
      include: { bizEvent: { include: { event: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if the user has a biz event
   * @param contentId - The ID of the content
   * @param bizUserId - The ID of the business user
   * @param eventCodeName - The code name of the event
   * @returns boolean indicating if the user has the event
   */
  private async hasBizEvent(
    contentId: string,
    bizUserId: string,
    eventCodeName: string,
  ): Promise<boolean> {
    return Boolean(
      await this.prisma.bizSession.findFirst({
        where: {
          contentId,
          bizUserId,
          deleted: false,
          bizEvent: { some: { event: { codeName: eventCodeName } } },
        },
      }),
    );
  }

  // ============================================================================
  // Rules Condition Processing Methods
  // ============================================================================

  /**
   * Evaluate rules conditions and return updated conditions
   * @param rulesConditions - Array of rules conditions to evaluate
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @param externalCompanyId - Optional company ID
   * @returns Updated rules conditions with evaluated conditions
   */
  private async evaluateRulesConditions(
    rulesConditions: RulesCondition[],
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    externalCompanyId?: string,
  ): Promise<RulesCondition[]> {
    const conditions = [...rulesConditions];
    for (let index = 0; index < conditions.length; index++) {
      const rules = conditions[index];
      if (rules.type === 'group' && rules.conditions) {
        for (let subIndex = 0; subIndex < rules.conditions.length; subIndex++) {
          const subRules = rules.conditions[subIndex];
          const isActivated = await this.evaluateCondition(
            subRules,
            environment,
            attributes,
            bizUser,
            externalCompanyId,
          );
          conditions[index].conditions[subIndex].actived = isActivated;
        }
      } else {
        const isActivated = await this.evaluateCondition(
          rules,
          environment,
          attributes,
          bizUser,
          externalCompanyId,
        );
        conditions[index] = { ...rules, actived: isActivated };
      }
    }
    return conditions;
  }

  /**
   * Evaluate a single condition and return if it is activated
   * @param rules - The condition to evaluate
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @param externalCompanyId - Optional company ID
   * @returns boolean indicating if the condition is activated
   */
  private async evaluateCondition(
    rules: RulesCondition,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    externalCompanyId?: string,
  ): Promise<boolean> {
    const userAttrs = attributes.filter((attr) => attr.bizType === AttributeBizType.USER);
    switch (rules.type) {
      case RulesType.USER_ATTR: {
        return await this.evaluateUserAttributeCondition(
          rules,
          environment,
          attributes,
          bizUser,
          externalCompanyId,
        );
      }
      case RulesType.SEGMENT: {
        const { segmentId } = rules.data;
        const segment = await this.prisma.segment.findFirst({
          where: { id: segmentId },
        });
        if (!segment) {
          return false;
        }
        if (segment.bizType === SegmentBizType.USER) {
          return await this.evaluateUserSegmentCondition(rules, environment, userAttrs, bizUser);
        }
        if (segment.bizType === SegmentBizType.COMPANY && externalCompanyId) {
          return await this.evaluateCompanySegmentCondition(
            rules,
            environment,
            attributes,
            bizUser,
            externalCompanyId,
          );
        }
        return false;
      }
      case RulesType.CONTENT: {
        return await this.evaluateContentCondition(rules, bizUser);
      }
      default: {
        return false;
      }
    }
  }

  /**
   * Evaluate user attribute condition
   * @param rules - The condition to evaluate
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @param externalCompanyId - Optional company ID
   * @returns boolean indicating if the condition is activated
   */
  private async evaluateUserAttributeCondition(
    rules: RulesCondition,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    externalCompanyId?: string,
  ): Promise<boolean> {
    const attr = attributes.find((attr) => attr.id === rules.data.attrId);
    if (!attr) {
      return false;
    }

    const evaluationOptions = await this.buildEvaluationOptions(
      attr.bizType,
      environment,
      attributes,
      bizUser,
      externalCompanyId,
    );

    if (!evaluationOptions) {
      return false;
    }

    return evaluateAttributeCondition(rules, evaluationOptions);
  }

  /**
   * Build complete RulesEvaluationOptions with all required attributes
   */
  private async buildEvaluationOptions(
    bizType: AttributeBizType,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    externalCompanyId?: string,
  ): Promise<RulesEvaluationOptions | null> {
    const userAttributes = (bizUser.data as Record<string, any>) || {};

    // USER type doesn't require company context
    if (bizType === AttributeBizType.USER) {
      return {
        attributes,
        userAttributes,
      };
    }

    // COMPANY and MEMBERSHIP types require company context
    if (!externalCompanyId) {
      return null;
    }

    // Query bizUserOnCompany with bizCompany included in one query
    const userOnCompany = await this.prisma.bizUserOnCompany.findFirst({
      where: {
        bizUserId: bizUser.id,
        bizCompany: {
          externalId: String(externalCompanyId),
          environmentId: environment.id,
        },
      },
      include: {
        bizCompany: {
          select: {
            data: true,
          },
        },
      },
    });

    if (!userOnCompany || !userOnCompany.bizCompany) {
      return null;
    }

    const companyAttributes = (userOnCompany.bizCompany.data as Record<string, any>) || {};
    const membershipAttributes = (userOnCompany.data as Record<string, any>) || {};

    return {
      attributes,
      userAttributes,
      companyAttributes,
      membershipAttributes,
    };
  }

  /**
   * Evaluate user segment condition
   * @param rules - The condition to evaluate
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @returns boolean indicating if the condition is activated
   */
  private async evaluateUserSegmentCondition(
    rules: RulesCondition,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
  ): Promise<boolean> {
    const { segmentId, logic = 'is' } = rules.data;
    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId },
    });
    if (!segment) {
      return false;
    }
    if (segment.dataType === SegmentDataType.ALL) {
      return logic === 'is';
    }
    if (segment.dataType === SegmentDataType.MANUAL) {
      const user = await this.prisma.bizUserOnSegment.findFirst({
        where: { segmentId, bizUserId: bizUser.id },
      });
      return logic === 'is' ? !!user : !user;
    }
    if (segment.dataType === SegmentDataType.CONDITION) {
      const filter = createConditionsFilter(segment.data, attributes);
      const segmentUser = await this.prisma.bizUser.findFirst({
        where: {
          environmentId: environment.id,
          externalId: String(bizUser.externalId),
          ...filter,
        },
      });
      return logic === 'is' ? !!segmentUser : !segmentUser;
    }
    return false;
  }

  /**
   * Evaluate company segment condition
   * @param rules - The condition to evaluate
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @param externalCompanyId - Optional company ID
   * @returns boolean indicating if the condition is activated
   */
  private async evaluateCompanySegmentCondition(
    rules: RulesCondition,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    externalCompanyId: string,
  ): Promise<boolean> {
    const { segmentId, logic = 'is' } = rules.data;
    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId },
    });
    const bizCompany = await this.prisma.bizCompany.findFirst({
      where: { externalId: String(externalCompanyId), environmentId: environment.id },
    });

    if (!segment || !bizCompany) {
      return false;
    }

    const relation = await this.prisma.bizUserOnCompany.findFirst({
      where: { bizUserId: bizUser.id, bizCompanyId: bizCompany.id },
    });

    if (!relation) {
      return false;
    }

    if (segment.dataType === SegmentDataType.ALL) {
      return logic === 'is';
    }

    if (segment.dataType === SegmentDataType.MANUAL) {
      const item = await this.prisma.bizCompanyOnSegment.findFirst({
        where: { segmentId, bizCompanyId: bizCompany.id },
      });
      return logic === 'is' ? !!item : !item;
    }

    const found = await this.findCompanyBySegmentConditions(
      segment,
      attributes,
      bizCompany,
      environment,
    );

    return logic === 'is' ? found : !found;
  }

  /**
   * Evaluate content condition
   * @param rules - The condition to evaluate
   * @param bizUser - The business user to check against
   * @returns boolean indicating if the condition is activated
   */
  private async evaluateContentCondition(
    rules: RulesCondition,
    bizUser: BizUser,
  ): Promise<boolean> {
    const { contentId, logic } = rules.data;

    if (!contentId || !logic) {
      return false;
    }

    // Special handling for activated/unactivated logic
    if (logic === ContentConditionLogic.ACTIVED || logic === ContentConditionLogic.UNACTIVED) {
      const latestSession = await this.getLatestSession(contentId, bizUser.id);
      if (!latestSession) {
        return logic === ContentConditionLogic.UNACTIVED;
      }
      const isActivated = !(
        flowIsDismissed(latestSession.bizEvent) || checklistIsDimissed(latestSession.bizEvent)
      );
      return logic === ContentConditionLogic.ACTIVED ? isActivated : !isActivated;
    }

    if (logic === ContentConditionLogic.SEEN || logic === ContentConditionLogic.UNSEEN) {
      const isSeen = await this.hasBizEvent(contentId, bizUser.id, BizEvents.FLOW_STEP_SEEN);
      return logic === ContentConditionLogic.SEEN ? isSeen : !isSeen;
    }

    if (logic === ContentConditionLogic.COMPLETED || logic === ContentConditionLogic.UNCOMPLETED) {
      const isCompleted = await this.hasBizEvent(contentId, bizUser.id, BizEvents.FLOW_COMPLETED);
      return logic === ContentConditionLogic.COMPLETED ? isCompleted : !isCompleted;
    }

    return false;
  }

  /**
   * Filter conditions by business type
   * @param segmentData - Segment data containing conditions
   * @param attributes - Available attributes
   * @param bizType - Business type to filter by
   * @returns Filtered segment data
   */
  private filterConditionsByBizType(
    segmentData: SegmentDataItem[],
    attributes: Attribute[],
    bizType: AttributeBizType,
  ): SegmentDataItem[] {
    return segmentData.filter((item) =>
      attributes.find((attr) => attr.bizType === bizType && item.data.attrId === attr.id),
    );
  }

  /**
   * Find company by segment conditions
   * @param segment - Segment data containing conditions
   * @param attributes - Available attributes
   * @param bizCompany - Business company
   * @param environment - Environment context
   * @returns boolean indicating if the condition is activated
   */
  private async findCompanyBySegmentConditions(
    segment: any,
    attributes: Attribute[],
    bizCompany: any,
    environment: Environment,
  ): Promise<boolean> {
    if (segment.dataType !== SegmentDataType.CONDITION) {
      return false;
    }

    const segmentData = segment.data as unknown as SegmentDataItem[];

    if (!Array.isArray(segmentData)) {
      return false;
    }

    const companyConditions = this.filterConditionsByBizType(
      segmentData,
      attributes,
      AttributeBizType.COMPANY,
    );
    const userConditions = this.filterConditionsByBizType(
      segmentData,
      attributes,
      AttributeBizType.USER,
    );
    const membershipConditions = this.filterConditionsByBizType(
      segmentData,
      attributes,
      AttributeBizType.MEMBERSHIP,
    );

    const companyFilter = createConditionsFilter(companyConditions, attributes);
    const userFilter = createConditionsFilter(userConditions, attributes);
    const membershipFilter = createConditionsFilter(membershipConditions, attributes);

    const hasUserFilter = userFilter && Object.keys(userFilter).length > 0;
    const hasMembershipFilter = membershipFilter && Object.keys(membershipFilter).length > 0;

    const segmentItem = await this.prisma.bizUserOnCompany.findFirst({
      where: {
        ...(hasMembershipFilter ? membershipFilter : {}),
        bizCompany: {
          id: bizCompany.id,
          environmentId: environment.id,
          ...(companyFilter ? companyFilter : {}),
        },
        ...(hasUserFilter ? { bizUser: userFilter } : {}),
      },
    });

    return !!segmentItem;
  }

  // ============================================================================
  // Content Processing Methods
  // ============================================================================

  /**
   * Process configuration and return processed config with activated rules
   * @param version - The version containing the config
   * @param environment - The environment context
   * @param attributes - Available attributes
   * @param bizUser - The business user
   * @param externalCompanyId - Optional company ID
   * @returns Processed configuration with activated rules
   */
  private async getProcessedConfig(
    version: Version,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    externalCompanyId?: string,
  ): Promise<ContentConfigObject> {
    const config = version.config
      ? (version.config as ContentConfigObject)
      : {
          enabledAutoStartRules: false,
          enabledHideRules: false,
          autoStartRules: [],
          hideRules: [],
          autoStartRulesSetting: {},
          hideRulesSetting: {},
        };

    const autoStartRules =
      config.enabledAutoStartRules && config.autoStartRules.length > 0
        ? await this.evaluateRulesConditions(
            config.autoStartRules,
            environment,
            attributes,
            bizUser,
            externalCompanyId,
          )
        : [];

    const hideRules =
      config.enabledHideRules && config.hideRules.length > 0
        ? await this.evaluateRulesConditions(
            config.hideRules,
            environment,
            attributes,
            bizUser,
            externalCompanyId,
          )
        : [];

    return {
      ...config,
      autoStartRules,
      hideRules,
    };
  }

  /**
   * Evaluate checklist conditions and return updated items
   * @param data - Checklist data containing items and conditions
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @param externalCompanyId - Optional company ID
   * @returns Updated checklist data with evaluated conditions
   */
  private async evaluateChecklistConditions(
    data: ChecklistData,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    externalCompanyId?: string,
  ) {
    const items = await Promise.all(
      data.items.map(async (item) => {
        const completeConditions = item.completeConditions
          ? await this.evaluateRulesConditions(
              item.completeConditions,
              environment,
              attributes,
              bizUser,
              externalCompanyId,
            )
          : [];
        const onlyShowTaskConditions = item.onlyShowTaskConditions
          ? await this.evaluateRulesConditions(
              item.onlyShowTaskConditions,
              environment,
              attributes,
              bizUser,
              externalCompanyId,
            )
          : [];
        return {
          ...item,
          completeConditions,
          onlyShowTaskConditions,
        };
      }),
    );
    return { ...data, items };
  }

  /**
   * Evaluate step triggers and return updated steps
   * @param steps - Array of steps to process
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @param externalCompanyId - Optional company ID
   * @returns Updated steps with evaluated conditions
   */
  private async evaluateStepTriggers(
    steps: Step[],
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    externalCompanyId?: string,
  ): Promise<Step[]> {
    const stepsData = [...steps];
    for (let index = 0; index < stepsData.length; index++) {
      const step = stepsData[index];
      if (step.trigger && Array.isArray(step.trigger)) {
        for (let subIndex = 0; subIndex < step.trigger.length; subIndex++) {
          const trigger = step.trigger[subIndex] as any;
          if (trigger?.conditions) {
            const triggerData = await this.evaluateRulesConditions(
              trigger.conditions,
              environment,
              attributes,
              bizUser,
              externalCompanyId,
            );
            stepsData[index].trigger[subIndex].conditions = triggerData;
          }
        }
      }
    }
    return stepsData;
  }

  /**
   * Process content with optimized data fetching
   * @param version - Pre-fetched version data
   * @param environment - The environment context
   * @param bizUser - The business user
   * @param attributes - Available attributes
   * @param session - Pre-fetched session statistics
   * @param externalCompanyId - Optional company ID
   * @returns Processed content configuration or null if processing fails
   */
  private async processContentOptimized(
    version: VersionWithStepsAndContent,
    environment: Environment,
    bizUser: BizUser,
    attributes: Attribute[],
    session: ContentSessionCollection,
    externalCompanyId?: string,
  ): Promise<CustomContentVersion> {
    if (!version) {
      return null;
    }

    const content = version.content;

    // Process config and data in parallel
    const [config, processedData, processedSteps] = await Promise.all([
      this.getProcessedConfig(version, environment, attributes, bizUser, externalCompanyId),
      content.type === ContentDataType.CHECKLIST
        ? this.evaluateChecklistConditions(
            version.data as unknown as ChecklistData,
            environment,
            attributes,
            bizUser,
            externalCompanyId,
          )
        : Promise.resolve(version.data),
      this.evaluateStepTriggers(version.steps, environment, attributes, bizUser, externalCompanyId),
    ]);

    return {
      ...version,
      data: processedData as any,
      steps: processedSteps,
      config,
      content,
      session,
    };
  }
}
