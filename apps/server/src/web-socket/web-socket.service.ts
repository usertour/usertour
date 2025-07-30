import { Attribute, AttributeBizType } from '@/attributes/models/attribute.model';
import { BizService } from '@/biz/biz.service';
import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import { createConditionsFilter, createFilterItem } from '@/common/attribute/filter';
import { EventAttributes, UserAttributes, CompanyAttributes } from '@usertour/types';
import { ContentType } from '@/content/models/content.model';
import { ChecklistData, ContentConfigObject, RulesCondition } from '@/content/models/version.model';
import { getEventProgress, getEventState, isValidEvent } from '@/utils/event';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BizUser,
  Content,
  Environment,
  Step,
  Theme,
  Prisma,
  Version,
  BizEvent,
  BizSession,
} from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { IntegrationService } from '@/integration/integration.service';
import { TrackEventData } from '@/common/types/track';
import { LicenseService } from '@/license/license.service';
import {
  BizEventWithEvent,
  BizSessionWithEvents,
  ConfigRequest,
  ConfigResponse,
  ContentResponse,
  CreateSessionRequest,
  ListContentsRequest,
  ListThemesRequest,
  TrackEventRequest,
  UpsertCompanyRequest,
  UpsertCompanyResponse,
  UpsertUserRequest,
  UpsertUserResponse,
  ContentSession,
  GetProjectSettingsRequest,
  GetProjectSettingsResponse,
} from './web-socket.dto';
import { getPublishedVersionId } from '@/utils/content';
import { BizEvents } from '@usertour/types';

const EVENT_CODE_MAP = {
  seen: { eventCodeName: BizEvents.FLOW_STEP_SEEN, expectResult: true },
  unseen: { eventCodeName: BizEvents.FLOW_STEP_SEEN, expectResult: false },
  completed: { eventCodeName: BizEvents.FLOW_COMPLETED, expectResult: true },
  uncompleted: { eventCodeName: BizEvents.FLOW_COMPLETED, expectResult: false },
  actived: { eventCodeName: BizEvents.FLOW_STARTED, expectResult: true },
  unactived: { eventCodeName: BizEvents.FLOW_STARTED, expectResult: false },
} as const;

interface SegmentDataItem {
  data: {
    logic: string;
    attrId: string;
  };
  type: 'company-attr' | 'user-attr' | 'membership-attr';
  operators: 'and' | 'or';
}

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  constructor(
    private prisma: PrismaService,
    private bizService: BizService,
    private integrationService: IntegrationService,
    private configService: ConfigService,
    private licenseService: LicenseService,
  ) {}

  /**
   * Get configuration settings based on environment token
   * @param body - Request body containing environment token
   * @returns Configuration object with plan type and branding settings
   */
  async getConfig(body: ConfigRequest, environment: Environment): Promise<ConfigResponse> {
    try {
      const isSelfHostedMode = this.configService.get('globalConfig.isSelfHostedMode');

      if (isSelfHostedMode) {
        return await this.getSelfHostedConfig(environment);
      }

      return await this.getCloudConfig(environment);
    } catch (error) {
      this.logger.error({
        message: `Error getting config: ${error.message}`,
        stack: error.stack,
        body,
      });
      return {
        removeBranding: false,
        planType: 'hobby',
      };
    }
  }

  /**
   * Get configuration for self-hosted mode using license validation
   * @returns Configuration object with plan type and branding settings
   */
  private async getSelfHostedConfig(environment: Environment): Promise<ConfigResponse> {
    const defaultConfig: ConfigResponse = {
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
  private async getCloudConfig(environment: Environment): Promise<ConfigResponse> {
    const defaultConfig: ConfigResponse = {
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

  /**
   * Process configuration and return processed config with activated rules
   * @param version - The version containing the config
   * @param environment - The environment context
   * @param attributes - Available attributes
   * @param bizUser - The business user
   * @param externalCompanyId - Optional company ID
   * @returns Processed configuration with activated rules
   */
  async getProcessedConfig(
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
        };

    const autoStartRules =
      config.enabledAutoStartRules && config.autoStartRules.length > 0
        ? await this.activedRulesConditions(
            config.autoStartRules,
            environment,
            attributes,
            bizUser,
            externalCompanyId,
          )
        : [];

    const hideRules =
      config.enabledHideRules && config.hideRules.length > 0
        ? await this.activedRulesConditions(
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
   * List content for a user with optimized performance
   * @param body - The body containing the token, user ID, and company ID
   * @returns Array of content
   */
  async listContent(
    body: ListContentsRequest,
    environment: Environment,
  ): Promise<ContentResponse[]> {
    try {
      const { userId: externalUserId, companyId: externalCompanyId } = body;
      const environmentId = environment.id;

      // Step 1: Get content list
      const contentList = await this.prisma.content.findMany({
        where: {
          contentOnEnvironments: {
            some: {
              environmentId,
              published: true,
            },
          },
        },
        include: {
          contentOnEnvironments: true,
        },
      });

      if (contentList.length === 0) {
        return [];
      }

      // Step 2: Get bizUser and attributes in parallel
      const [bizUser, attributes] = await Promise.all([
        this.prisma.bizUser.findFirst({
          where: { externalId: String(externalUserId), environmentId },
        }),
        this.prisma.attribute.findMany({
          where: {
            projectId: environment.projectId,
            bizType: {
              in: [AttributeBizType.USER, AttributeBizType.COMPANY, AttributeBizType.MEMBERSHIP],
            },
          },
        }),
      ]);

      if (!bizUser) {
        return [];
      }

      // Step 3: Batch fetch all versions and steps
      const versionIds = contentList
        .map((content) => getPublishedVersionId(content, environment.id))
        .filter(Boolean);

      const versions = await this.prisma.version.findMany({
        where: { id: { in: versionIds } },
        include: { steps: { orderBy: { sequence: 'asc' } } },
      });

      const versionMap = new Map(versions.map((v) => [v.id, v]));

      // Step 4: Batch fetch session statistics for all contents
      const contentSessionMap = await this.getBatchContentSession(
        contentList.map((c) => c.id),
        bizUser.id,
      );

      // Step 5: Process all contents in parallel
      const processedContents = await Promise.all(
        contentList.map(async (content) => {
          const publishedVersionId = getPublishedVersionId(content, environment.id);

          const version = versionMap.get(publishedVersionId);
          if (!version) {
            return null;
          }

          return await this.processContentOptimized(
            content,
            version,
            environment,
            bizUser,
            attributes,
            contentSessionMap.get(content.id),
            String(externalCompanyId),
          );
        }),
      );

      return processedContents.filter(Boolean);
    } catch (error) {
      this.logger.error({
        message: `Error in listContent: ${error.message}`,
        stack: error.stack,
        body,
      });
      return [];
    }
  }

  /**
   * Process checklist conditions and return updated items
   * @param data - Checklist data containing items and conditions
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @param externalCompanyId - Optional company ID
   * @returns Updated checklist data with processed conditions
   */
  async activedChecklistConditions(
    data: ChecklistData,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    externalCompanyId?: string,
  ) {
    try {
      const items = await Promise.all(
        data.items.map(async (item) => {
          const completeConditions = item.completeConditions
            ? await this.activedRulesConditions(
                item.completeConditions,
                environment,
                attributes,
                bizUser,
                externalCompanyId,
              )
            : [];
          const onlyShowTaskConditions = item.onlyShowTaskConditions
            ? await this.activedRulesConditions(
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
    } catch (error) {
      this.logger.error({
        message: `Error in activedChecklistConditions: ${error.message}`,
        stack: error.stack,
        data,
        environment,
        attributes,
      });
      return data;
    }
  }

  /**
   * Process step triggers and return updated steps
   * @param steps - Array of steps to process
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @param externalCompanyId - Optional company ID
   * @returns Updated steps with processed conditions
   */
  async activedStepTriggers(
    steps: Step[],
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    externalCompanyId?: string,
  ): Promise<Step[]> {
    try {
      const stepsData = [...steps];
      for (let index = 0; index < stepsData.length; index++) {
        const step = stepsData[index];
        if (step.trigger && Array.isArray(step.trigger)) {
          for (let subIndex = 0; subIndex < step.trigger.length; subIndex++) {
            const trigger = step.trigger[subIndex] as any;
            if (trigger?.conditions) {
              const triggerData = await this.activedRulesConditions(
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
    } catch (error) {
      this.logger.error({
        message: `Error in activedStepTriggers: ${error.message}`,
        stack: error.stack,
        steps,
        environment,
        attributes,
      });
      return steps;
    }
  }

  /**
   * Process rules conditions and return updated conditions
   * @param rulesConditions - Array of rules conditions to process
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @param externalCompanyId - Optional company ID
   * @returns Updated rules conditions with processed conditions
   */
  async activedRulesConditions(
    rulesConditions: RulesCondition[],
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    externalCompanyId?: string,
  ): Promise<RulesCondition[]> {
    try {
      const conditions = [...rulesConditions];
      for (let index = 0; index < conditions.length; index++) {
        const rules = conditions[index];
        if (rules.type === 'group') {
          for (let subIndex = 0; subIndex < rules.conditions.length; subIndex++) {
            const subRules = rules.conditions[subIndex];
            const isAcvited = await this.activedRulesCondition(
              subRules,
              environment,
              attributes,
              bizUser,
              externalCompanyId,
            );
            conditions[index].conditions[subIndex].actived = isAcvited;
          }
        } else {
          const isAcvited = await this.activedRulesCondition(
            rules,
            environment,
            attributes,
            bizUser,
            externalCompanyId,
          );
          conditions[index] = { ...rules, actived: isAcvited };
        }
      }
      return conditions;
    } catch (error) {
      this.logger.error({
        message: `Error in activedRulesConditions: ${error.message}`,
        stack: error.stack,
        rulesConditions,
        environment,
        attributes,
      });
      return rulesConditions;
    }
  }

  /**
   * Process a single rule condition and return if it is activated
   * @param rules - The rule condition to process
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @param externalCompanyId - Optional company ID
   * @returns boolean indicating if the condition is activated
   */
  async activedRulesCondition(
    rules: RulesCondition,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    externalCompanyId?: string,
  ): Promise<boolean> {
    const userAttrs = attributes.filter((attr) => attr.bizType === AttributeBizType.USER);
    switch (rules.type) {
      case 'user-attr': {
        return await this.activedUserAttributeRulesCondition(
          rules,
          environment,
          attributes,
          bizUser,
          externalCompanyId,
        );
      }
      case 'segment': {
        const { segmentId } = rules.data;
        const segment = await this.prisma.segment.findFirst({
          where: { id: segmentId },
        });
        if (!segment) {
          return false;
        }
        if (segment.bizType === SegmentBizType.USER) {
          return await this.activedUserSegmentRulesCondition(
            rules,
            environment,
            userAttrs,
            bizUser,
          );
        }
        if (segment.bizType === SegmentBizType.COMPANY && externalCompanyId) {
          return await this.activedCompanySegmentRulesCondition(
            rules,
            environment,
            attributes,
            bizUser,
            externalCompanyId,
          );
        }
        return false;
      }
      case 'content': {
        return await this.activedContentRulesCondition(rules, bizUser);
      }
      default: {
        return false;
      }
    }
  }

  /**
   * Process user attribute rules condition
   * @param rules - The rule condition to process
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @param externalCompanyId - Optional company ID
   * @returns boolean indicating if the condition is activated
   */
  async activedUserAttributeRulesCondition(
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

    const filter = createFilterItem(rules, attributes) || {};
    const environmentId = environment.id;

    switch (attr.bizType) {
      case AttributeBizType.USER: {
        const segmentUser = await this.prisma.bizUser.findFirst({
          where: {
            environmentId,
            externalId: String(bizUser.externalId),
            ...filter,
          },
        });
        return !!segmentUser;
      }

      case AttributeBizType.COMPANY:
      case AttributeBizType.MEMBERSHIP: {
        if (!externalCompanyId) return false;

        const bizCompany = await this.prisma.bizCompany.findFirst({
          where: {
            externalId: String(externalCompanyId),
            environmentId,
          },
        });
        if (!bizCompany) return false;

        const segmentUser = await this.prisma.bizUserOnCompany.findFirst({
          where: {
            bizUserId: bizUser.id,
            bizCompanyId: bizCompany.id,
            ...(attr.bizType === AttributeBizType.COMPANY ? { bizCompany: filter } : filter),
          },
        });
        return !!segmentUser;
      }

      default:
        return false;
    }
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

  /**
   * Process company segment rules condition
   * @param rules - The rule condition to process
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @param externalCompanyId - Optional company ID
   * @returns boolean indicating if the condition is activated
   */
  async activedCompanySegmentRulesCondition(
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
   * Process user segment rules condition
   * @param rules - The rule condition to process
   * @param environment - Environment context
   * @param attributes - Available attributes
   * @param bizUser - Business user
   * @returns boolean indicating if the condition is activated
   */
  async activedUserSegmentRulesCondition(
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
   * Check if the content rules condition is activated
   * @param rules - The rules condition to check
   * @param bizUser - The business user to check against
   * @returns boolean indicating if the condition is activated
   */
  async activedContentRulesCondition(rules: RulesCondition, bizUser: BizUser): Promise<boolean> {
    const { contentId, logic } = rules.data;

    if (!contentId || !logic) {
      return false;
    }

    const eventCodeMap = EVENT_CODE_MAP[logic];
    if (!eventCodeMap) {
      return false;
    }

    const { eventCodeName, expectResult } = eventCodeMap;

    // Special handling for actived/unactived logic
    if (logic === 'actived' || logic === 'unactived') {
      const latestSession = await this.getLatestSession(contentId, bizUser.id);
      if (!latestSession) {
        return logic === 'unactived';
      }
      const hasEndedEvent = latestSession.bizEvent?.find(
        (event) => event.event.codeName === BizEvents.FLOW_ENDED,
      );
      const isActived = !hasEndedEvent;
      return logic === 'actived' ? isActived : !isActived;
    }

    // Handle other logic types
    const session = await this.prisma.bizSession.findFirst({
      where: {
        bizUserId: bizUser.id,
        contentId,
        bizEvent: {
          some: {
            event: {
              codeName: eventCodeName,
            },
          },
        },
      },
    });

    return session ? expectResult : !expectResult;
  }

  /**
   * List events for a session
   * @param sessionId - The ID of the session to list events for
   * @returns Array of events
   */
  async listEvents(sessionId: string): Promise<BizEventWithEvent[]> {
    return await this.prisma.bizEvent.findMany({
      where: { bizSessionId: sessionId },
      include: { event: true },
    });
  }

  /**
   * Get the latest session for a content and user
   * @param contentId - The ID of the content
   * @param bizUserId - The ID of the business user
   * @returns The latest session
   */
  async getLatestSession(
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
   * Get the number of dismissed sessions for a content and user
   * @param content - The content to check
   * @param bizUserId - The ID of the business user
   * @returns The number of dismissed sessions
   */
  async getDismissedSessions(content: Content, bizUserId: string): Promise<number> {
    let codeName = '';
    if (content.type === ContentType.FLOW) {
      codeName = BizEvents.FLOW_ENDED;
    } else if (content.type === ContentType.LAUNCHER) {
      codeName = BizEvents.LAUNCHER_DISMISSED;
    } else if (content.type === ContentType.CHECKLIST) {
      codeName = BizEvents.CHECKLIST_DISMISSED;
    }
    return await this.prisma.bizSession.count({
      where: {
        contentId: content.id,
        bizUserId,
        deleted: false,
        bizEvent: {
          some: {
            event: {
              codeName,
            },
          },
        },
      },
    });
  }

  /**
   * Get the number of completed sessions for a content and user
   * @param content - The content to check
   * @param bizUserId - The ID of the business user
   * @returns The number of completed sessions
   */
  async getCompletedSessions(content: Content, bizUserId: string): Promise<number> {
    let codeName = '';
    if (content.type === ContentType.FLOW) {
      codeName = BizEvents.FLOW_COMPLETED;
    } else if (content.type === ContentType.LAUNCHER) {
      codeName = BizEvents.LAUNCHER_ACTIVATED;
    } else if (content.type === ContentType.CHECKLIST) {
      codeName = BizEvents.CHECKLIST_COMPLETED;
    }
    return await this.prisma.bizSession.count({
      where: {
        contentId: content.id,
        bizUserId,
        deleted: false,
        bizEvent: {
          some: {
            event: {
              codeName,
            },
          },
        },
      },
    });
  }

  /**
   * Get the total number of sessions for a content and user
   * @param content - The content to check
   * @param bizUserId - The ID of the business user
   * @returns The total number of sessions
   */
  async getTotalSessions(content: Content, bizUserId: string): Promise<number> {
    return await this.prisma.bizSession.count({
      where: { contentId: content.id, bizUserId, deleted: false },
    });
  }

  /**
   * Get the number of active sessions for a content and user
   * @param content - The content to check
   * @param bizUserId - The ID of the business user
   * @returns The number of active sessions
   */
  async getActiveSessions(content: Content, bizUserId: string): Promise<number> {
    return await this.prisma.bizSession.count({
      where: { contentId: content.id, bizUserId, deleted: false, state: 0 },
    });
  }

  /**
   * Get the number of seen sessions for a content and user
   * @param content - The content to check
   * @param bizUserId - The ID of the business user
   * @returns The number of seen sessions
   */
  async getSeenSessions(content: Content, bizUserId: string): Promise<number> {
    return await this.prisma.bizSession.count({
      where: {
        contentId: content.id,
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
    });
  }

  /**
   * List themes for an environment
   * @param token - The token of the environment
   * @returns Array of themes
   */
  async listThemes(body: ListThemesRequest, environment: Environment): Promise<Theme[]> {
    const { userId: externalUserId, companyId: externalCompanyId } = body;
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
              ? await this.activedRulesConditions(
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
   * Upsert business users
   * @param data - The data to upsert
   * @returns The upserted business users
   */
  async upsertBizUsers(
    data: UpsertUserRequest,
    environment: Environment,
  ): Promise<UpsertUserResponse> {
    const { userId, attributes } = data;
    return await this.bizService.upsertBizUsers(this.prisma, userId, attributes, environment.id);
  }

  /**
   * Upsert business companies
   * @param data - The data to upsert
   * @returns The upserted business companies
   */
  async upsertBizCompanies(
    data: UpsertCompanyRequest,
    environment: Environment,
  ): Promise<UpsertCompanyResponse> {
    const { companyId: externalCompanyId, userId: externalUserId, attributes, membership } = data;
    return await this.bizService.upsertBizCompanies(
      this.prisma,
      externalCompanyId,
      externalUserId,
      attributes,
      environment.id,
      membership,
    );
  }

  /**
   * Create a session
   * @param data - The data to create a session
   * @returns The created session
   */
  async createSession(
    data: CreateSessionRequest,
    environment: Environment,
  ): Promise<BizSession | null> {
    const {
      userId: externalUserId,
      contentId,
      companyId: externalCompanyId,
      reason,
      context,
    } = data;
    const environmentId = environment.id;
    const bizUser = await this.prisma.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId },
    });
    const bizCompany = await this.prisma.bizCompany.findFirst({
      where: { externalId: String(externalCompanyId), environmentId },
    });
    if (!bizUser || (externalCompanyId && !bizCompany)) {
      return null;
    }
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        contentOnEnvironments: true,
      },
    });
    if (!content) {
      return null;
    }

    const publishedVersionId = getPublishedVersionId(content, environmentId);

    const version = await this.prisma.version.findUnique({
      where: { id: publishedVersionId },
    });

    if (!version) {
      return null;
    }

    const session = await this.prisma.bizSession.create({
      data: {
        state: 0,
        progress: 0,
        projectId: environment.projectId,
        environmentId: environment.id,
        bizUserId: bizUser.id,
        contentId: content.id,
        versionId: publishedVersionId,
        bizCompanyId: externalCompanyId ? bizCompany.id : null,
      },
    });

    // If the content is a flow or checklist, create a start event
    if (content.type === ContentType.FLOW || content.type === ContentType.CHECKLIST) {
      // Always create start event when session is created
      const startReason = reason || 'auto_start';
      const eventName =
        content.type === ContentType.FLOW ? BizEvents.FLOW_STARTED : BizEvents.CHECKLIST_STARTED;

      // Use trackEvent to ensure consistent event parameters
      const baseEventData = {
        [EventAttributes.PAGE_URL]: context?.pageUrl,
        [EventAttributes.VIEWPORT_WIDTH]: context?.viewportWidth,
        [EventAttributes.VIEWPORT_HEIGHT]: context?.viewportHeight,
      };

      const eventData =
        content.type === ContentType.FLOW
          ? {
              ...baseEventData,
              [EventAttributes.FLOW_START_REASON]: startReason,
              [EventAttributes.FLOW_VERSION_ID]: version.id,
              [EventAttributes.FLOW_VERSION_NUMBER]: version.sequence,
            }
          : {
              ...baseEventData,
              [EventAttributes.CHECKLIST_ID]: content.id,
              [EventAttributes.CHECKLIST_NAME]: content.name,
              [EventAttributes.CHECKLIST_START_REASON]: startReason,
              [EventAttributes.CHECKLIST_VERSION_ID]: version.id,
              [EventAttributes.CHECKLIST_VERSION_NUMBER]: version.sequence,
            };

      await this.trackEvent(
        {
          token: data.token,
          userId: String(externalUserId),
          eventName,
          sessionId: session.id,
          eventData,
        },
        environment,
      );
    }

    return session;
  }

  /**
   * Get filtered event data
   * @param eventId - The ID of the event
   * @param data - The data to get filtered event data
   * @returns The filtered event data
   */
  async getFilterdEventData(eventId: string, data: any): Promise<Record<string, any> | false> {
    const attributes = await this.prisma.attributeOnEvent.findMany({
      where: { eventId },
      include: { attribute: true },
    });
    if (!attributes || attributes.length === 0) {
      return false;
    }

    const attrs = {};
    for (const key in data) {
      const isFind = attributes.find((attr) => attr.attribute.codeName === key);
      if (isFind) {
        attrs[key] = data[key];
      }
    }
    return attrs;
  }

  /**
   * Update user and company seen attributes
   * @param tx - Database transaction
   * @param user - Business user
   * @param bizSession - Business session
   * @returns Promise<void>
   */
  private async updateSeenAttributes(
    tx: Prisma.TransactionClient,
    user: BizUser,
    bizSession: { bizCompanyId: string | null },
  ): Promise<void> {
    // Update user attributes
    const currentTime = new Date().toISOString();
    const userData = (user.data as Record<string, unknown>) || {};
    const isFirstUserEvent = !userData[UserAttributes.FIRST_SEEN_AT];

    const updatedUserData = {
      ...userData,
      [UserAttributes.LAST_SEEN_AT]: currentTime,
      ...(isFirstUserEvent && { [UserAttributes.FIRST_SEEN_AT]: currentTime }),
    };

    await tx.bizUser.update({
      where: { id: user.id },
      data: { data: updatedUserData },
    });

    // Update company attributes if user belongs to a company
    if (bizSession.bizCompanyId) {
      const company = await tx.bizCompany.findUnique({
        where: { id: bizSession.bizCompanyId },
      });

      if (company) {
        const companyData = (company.data as Record<string, unknown>) || {};
        const isFirstCompanyEvent = !companyData[CompanyAttributes.FIRST_SEEN_AT];

        const updatedCompanyData = {
          ...companyData,
          [CompanyAttributes.LAST_SEEN_AT]: currentTime,
          ...(isFirstCompanyEvent && { [CompanyAttributes.FIRST_SEEN_AT]: currentTime }),
        };

        await tx.bizCompany.update({
          where: { id: company.id },
          data: { data: updatedCompanyData },
        });
      }
    }
  }

  /**
   * Track an event
   * @param data - The data to track an event
   * @returns The tracked event
   */
  async trackEvent(data: TrackEventRequest, environment: Environment): Promise<BizEvent | false> {
    const { userId: externalUserId, eventName, sessionId, eventData } = data;
    const environmentId = environment.id;
    const projectId = environment.projectId;
    const bizUser = await this.prisma.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId },
    });
    if (!bizUser) {
      return false;
    }
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: {
        content: { include: { contentOnEnvironments: true } },
        bizEvent: { include: { event: true } },
        version: true,
      },
    });
    if (!bizSession || bizSession.state === 1) {
      return false;
    }
    const event = await this.prisma.event.findFirst({
      where: { codeName: eventName, projectId },
    });
    if (!event) {
      return false;
    }
    const events = await this.getFilterdEventData(event.id, eventData);
    if (!events) {
      return false;
    }

    const contentId = bizSession.contentId;
    const versionId = bizSession.versionId;

    const progress =
      events?.flow_step_progress !== undefined
        ? getEventProgress(eventName, events.flow_step_progress)
        : undefined;
    const state = getEventState(eventName);

    const result = await this.prisma.$transaction(async (tx) => {
      // Re-fetch the session with latest events inside the transaction and lock the row
      const latestBizSession = await tx.bizSession.findUnique({
        where: { id: sessionId },
        include: {
          bizEvent: { include: { event: true } },
        },
      });

      if (!latestBizSession || latestBizSession.state === 1) {
        return false;
      }

      // Validate event inside the transaction with latest data
      if (!isValidEvent(eventName, latestBizSession, events)) {
        return false;
      }

      // Update seen attributes for user and company
      await this.updateSeenAttributes(tx, bizUser, bizSession);

      const insert = {
        bizUserId: bizUser.id,
        eventId: event.id,
        data: events,
        bizSessionId: bizSession.id,
      };
      const bizEvent = await tx.bizEvent.create({
        data: insert,
      });
      await tx.bizSession.update({
        where: { id: bizSession.id },
        data: {
          ...(progress !== undefined && { progress }),
          state,
        },
      });
      if (eventName === BizEvents.QUESTION_ANSWERED) {
        const answer: any = {
          bizEventId: bizEvent.id,
          contentId,
          cvid: events[EventAttributes.QUESTION_CVID],
          versionId,
          bizUserId: bizUser.id,
          bizSessionId: bizSession.id,
          environmentId,
        };
        if (events[EventAttributes.NUMBER_ANSWER]) {
          answer.numberAnswer = events[EventAttributes.NUMBER_ANSWER];
        }
        if (events[EventAttributes.TEXT_ANSWER]) {
          answer.textAnswer = events[EventAttributes.TEXT_ANSWER];
        }
        if (events[EventAttributes.LIST_ANSWER]) {
          answer.listAnswer = events[EventAttributes.LIST_ANSWER];
        }
        await tx.bizAnswer.create({
          data: answer,
        });
      }

      return bizEvent;
    });

    const trackEventData: TrackEventData = {
      eventName,
      bizSessionId: bizSession.id,
      userId: String(externalUserId),
      environmentId,
      projectId,
      eventProperties: {
        ...events,
      },
      userProperties: bizUser.data as Record<string, any>,
    };
    if (bizSession.content.type === ContentType.FLOW) {
      trackEventData.eventProperties = {
        ...trackEventData.eventProperties,
        [EventAttributes.FLOW_ID]: bizSession.content.id,
        [EventAttributes.FLOW_NAME]: bizSession.content.name,
        [EventAttributes.FLOW_SESSION_ID]: bizSession.id,
        [EventAttributes.FLOW_VERSION_ID]: bizSession.version.id,
        [EventAttributes.FLOW_VERSION_NUMBER]: bizSession.version.sequence,
      };
    }

    // this.integrationService.trackEvent(trackEventData);

    return result;
  }

  /**
   * Query ContentSession for a user/session
   * @param externalUserId - external user id
   * @param sessionId - session id
   * @param environment - environment context
   * @returns ContentSession or false if not found
   */
  async getContentSessionBySession(
    externalUserId: string,
    sessionId: string,
    environment: Environment,
  ): Promise<ContentSession | false> {
    const bizUser = await this.prisma.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId: environment.id },
    });
    if (!bizUser) return false;
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
    });
    if (!bizSession) return false;
    const contentSession = await this.getBatchContentSession([bizSession.contentId], bizUser.id);
    return {
      contentId: bizSession.contentId,
      ...contentSession.get(bizSession.contentId),
    };
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
  ): Promise<Map<string, ContentSession>> {
    const contentSessionMap = new Map<string, ContentSession>();

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
   * Process content with optimized data fetching
   * @param content - The content item to process
   * @param version - Pre-fetched version data
   * @param environment - The environment context
   * @param bizUser - The business user
   * @param attributes - Available attributes
   * @param contentSession - Pre-fetched session statistics
   * @param externalCompanyId - Optional company ID
   * @returns Processed content configuration or null if processing fails
   */
  private async processContentOptimized(
    content: Content & { contentOnEnvironments: any[] },
    version: Version & { steps: Step[] },
    environment: Environment,
    bizUser: BizUser,
    attributes: Attribute[],
    contentSession: ContentSession,
    externalCompanyId?: string,
  ): Promise<ContentResponse> {
    if (!version) {
      return null;
    }

    // Process config and data in parallel
    const [config, processedData, processedSteps] = await Promise.all([
      this.getProcessedConfig(version, environment, attributes, bizUser, externalCompanyId),
      content.type === ContentType.CHECKLIST
        ? this.activedChecklistConditions(
            version.data as unknown as ChecklistData,
            environment,
            attributes,
            bizUser,
            externalCompanyId,
          )
        : Promise.resolve(version.data),
      this.activedStepTriggers(version.steps, environment, attributes, bizUser, externalCompanyId),
    ]);

    return {
      ...version,
      data: processedData as any,
      steps: processedSteps,
      config,
      type: content.type as ContentType,
      name: content.name,
      latestSession: contentSession.latestSession,
      totalSessions: contentSession.totalSessions,
      dismissedSessions: contentSession.dismissedSessions,
      completedSessions: contentSession.completedSessions,
      seenSessions: contentSession.seenSessions,
    };
  }

  /**
   * Get project settings for an environment
   * @param body - Request body containing environment token
   * @returns Project settings including config and themes
   */
  async getProjectSettings(
    body: GetProjectSettingsRequest,
    environment: Environment,
  ): Promise<GetProjectSettingsResponse> {
    try {
      // Get config and themes in parallel
      const [config, themes] = await Promise.all([
        this.getConfig(body, environment),
        this.listThemes(body, environment),
      ]);

      return {
        config,
        themes,
      };
    } catch (error) {
      this.logger.error({
        message: `Error getting project settings: ${error.message}`,
        stack: error.stack,
        body,
      });

      // Return default values on error
      return {
        config: {
          removeBranding: false,
          planType: 'hobby',
        },
        themes: [],
      };
    }
  }
}
