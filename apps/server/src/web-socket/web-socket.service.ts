import { Attribute, AttributeBizType } from '@/attributes/models/attribute.model';
import { BizService } from '@/biz/biz.service';
import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import { createConditionsFilter, createFilterItem } from '@/common/attribute/filter';
import { BizEvents, EventAttributes } from '@/common/consts/attribute';
import { ContentType } from '@/content/models/content.model';
import { ChecklistData, ContentConfigObject, RulesCondition } from '@/content/models/version.model';
import { Environment } from '@/environments/models/environment.model';
import { getEventProgress, getEventState, isValidEvent } from '@/utils/event';
import { Injectable, Logger } from '@nestjs/common';
import { BizUser, Content, Step } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

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

interface ConfigResponse {
  removeBranding: boolean;
  planType: string;
}

interface ConfigRequest {
  token: string;
}

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  constructor(
    private prisma: PrismaService,
    private bizService: BizService,
  ) {}

  /**
   * Get configuration settings based on environment token
   * @param body - Request body containing environment token
   * @returns Configuration object with plan type and branding settings
   */
  async getConfig(body: ConfigRequest): Promise<ConfigResponse> {
    try {
      const { token } = body;

      // Default configuration
      const defaultConfig: ConfigResponse = {
        removeBranding: false,
        planType: 'hobby',
      };

      // Find environment by token
      const environment = await this.prisma.environment.findFirst({
        where: { token },
      });

      if (!environment) {
        return defaultConfig;
      }

      // Get project details
      const project = await this.prisma.project.findUnique({
        where: { id: environment.projectId },
      });

      if (!project?.subscriptionId) {
        return defaultConfig;
      }

      // Get subscription details
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
   * Process a single content item and return its configuration
   * @param content - The content item to process
   * @param environment - The environment context
   * @param bizUser - The business user
   * @param attributes - Available attributes
   * @param externalCompanyId - Optional company ID
   * @returns Processed content configuration or null if processing fails
   */
  private async processContent(
    content: Content & { contentOnEnvironments: any[] },
    environment: Environment,
    bizUser: BizUser,
    attributes: Attribute[],
    externalCompanyId?: string,
  ): Promise<any> {
    const publishedVersionId =
      content.contentOnEnvironments.find((item) => item.environmentId === environment.id)
        ?.publishedVersionId || content.publishedVersionId;

    const version = await this.prisma.version.findUnique({
      where: { id: publishedVersionId },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });

    if (!version) {
      return null;
    }

    const latestSession = await this.getLatestSession(content.id, bizUser.id);
    const events = latestSession ? await this.listEvents(latestSession.id) : [];
    const totalSessions = await this.getTotalSessions(content, bizUser.id);
    const dismissedSessions = await this.getDismissedSessions(content, bizUser.id);
    const completedSessions = await this.getCompletedSessions(content, bizUser.id);

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

    const data =
      content.type === ContentType.CHECKLIST
        ? await this.activedChecklistConditions(
            version.data as unknown as ChecklistData,
            environment,
            attributes,
            bizUser,
            externalCompanyId,
          )
        : version.data;

    const steps = await this.activedStepTriggers(
      version.steps,
      environment,
      attributes,
      bizUser,
      externalCompanyId,
    );

    return {
      ...version,
      data,
      steps,
      config: { ...config, autoStartRules, hideRules },
      type: content.type,
      name: content.name,
      latestSession,
      events,
      totalSessions,
      dismissedSessions,
      completedSessions,
    };
  }

  /**
   * List content for a user
   * @param body - The body containing the token, user ID, and company ID
   * @returns Array of content
   */
  async listContent(body: any): Promise<any> {
    try {
      const { token, userId: externalUserId, companyId: externalCompanyId } = body;
      const environment = await this.prisma.environment.findFirst({
        where: { token },
      });
      if (!environment) {
        return;
      }
      const environmentId = environment.id;
      const contentList = await this.prisma.content.findMany({
        where: {
          OR: [
            {
              environmentId,
              published: true,
              contentOnEnvironments: { none: {} },
            },
            {
              contentOnEnvironments: {
                some: {
                  environmentId,
                  published: true,
                },
              },
            },
          ],
        },
        include: {
          contentOnEnvironments: true,
        },
      });
      if (contentList.length === 0) {
        return;
      }
      const bizUser = await this.prisma.bizUser.findFirst({
        where: { externalId: String(externalUserId), environmentId },
      });
      if (!bizUser) {
        return;
      }
      const attributes = await this.prisma.attribute.findMany({
        where: {
          projectId: environment.projectId,
          bizType: {
            in: [AttributeBizType.USER, AttributeBizType.COMPANY, AttributeBizType.MEMBERSHIP],
          },
        },
      });

      const response: any[] = [];
      for (let index = 0; index < contentList.length; index++) {
        const content = contentList[index];
        const processedContent = await this.processContent(
          content,
          environment,
          bizUser,
          attributes,
          String(externalCompanyId),
        );
        if (processedContent) {
          response.push(processedContent);
        }
      }
      return response;
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
      const hasEndedEvent = latestSession.bizEvent.find(
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
  async listEvents(sessionId: string): Promise<any> {
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
  async getLatestSession(contentId: string, bizUserId: string): Promise<any> {
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
  async getDismissedSessions(content: Content, bizUserId: string): Promise<any> {
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
  async getCompletedSessions(content: Content, bizUserId: string): Promise<any> {
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
  async getTotalSessions(content: Content, bizUserId: string): Promise<any> {
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
  async getActiveSessions(content: Content, bizUserId: string): Promise<any> {
    return await this.prisma.bizSession.count({
      where: { contentId: content.id, bizUserId, deleted: false, state: 0 },
    });
  }

  /**
   * List themes for an environment
   * @param token - The token of the environment
   * @returns Array of themes
   */
  async listThemes({ token }: any): Promise<any> {
    const environmenet = await this.prisma.environment.findFirst({
      where: { token },
    });
    if (!environmenet) {
      return;
    }
    return await this.prisma.theme.findMany({
      where: { projectId: environmenet.projectId },
    });
  }

  /**
   * Upsert business users
   * @param data - The data to upsert
   * @returns The upserted business users
   */
  async upsertBizUsers(data: any): Promise<any> {
    const { userId, attributes, token } = data;
    const environmenet = await this.prisma.environment.findFirst({
      where: { token },
    });
    if (!environmenet) {
      return;
    }
    return await this.bizService.upsertBizUsers(this.prisma, userId, attributes, environmenet.id);
  }

  /**
   * Upsert business companies
   * @param data - The data to upsert
   * @returns The upserted business companies
   */
  async upsertBizCompanies(data: any): Promise<any> {
    const {
      companyId: externalCompanyId,
      userId: externalUserId,
      attributes,
      token,
      membership,
    } = data;
    const environmenet = await this.prisma.environment.findFirst({
      where: { token },
    });
    if (!environmenet) {
      return;
    }
    return await this.bizService.upsertBizCompanies(
      this.prisma,
      externalCompanyId,
      externalUserId,
      attributes,
      environmenet.id,
      membership,
    );
  }

  /**
   * Create a session
   * @param data - The data to create a session
   * @returns The created session
   */
  async createSession(data: any): Promise<any> {
    const { userId: externalUserId, token, contentId, companyId: externalCompanyId } = data;
    const environment = await this.prisma.environment.findFirst({
      where: { token },
    });
    if (!environment) {
      return;
    }
    const environmentId = environment.id;
    const bizUser = await this.prisma.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId },
    });
    const bizCompany = await this.prisma.bizCompany.findFirst({
      where: { externalId: String(externalCompanyId), environmentId },
    });
    if (!bizUser || (externalCompanyId && !bizCompany)) {
      return false;
    }
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        contentOnEnvironments: true,
      },
    });
    if (!content) {
      return false;
    }

    const publishedVersionId =
      content.contentOnEnvironments.find((item) => item.environmentId === environmentId)
        ?.publishedVersionId || content.publishedVersionId;

    return await this.prisma.bizSession.create({
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
  }

  /**
   * Get filtered event data
   * @param eventId - The ID of the event
   * @param data - The data to get filtered event data
   * @returns The filtered event data
   */
  async getFilterdEventData(eventId: string, data: any): Promise<any> {
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
   * Track an event
   * @param data - The data to track an event
   * @returns The tracked event
   */
  async trackEvent(data: any): Promise<any> {
    const { userId, token, eventName, sessionId, eventData } = data;
    const environmenet = await this.prisma.environment.findFirst({
      where: { token },
    });
    if (!environmenet) {
      return;
    }
    const environmentId = environmenet.id;
    const projectId = environmenet.projectId;
    const user = await this.prisma.bizUser.findFirst({
      where: { externalId: String(userId), environmentId },
    });
    if (!user) {
      return false;
    }
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: {
        content: { include: { contentOnEnvironments: true } },
        bizEvent: { include: { event: true } },
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

    const publishedVersionId =
      bizSession.content.contentOnEnvironments.find((item) => item.environmentId === environmentId)
        ?.publishedVersionId || bizSession.content.publishedVersionId;

    const currentVersion = await this.prisma.version.findUnique({
      where: { id: publishedVersionId },
      include: { steps: true },
    });

    if (!currentVersion || !isValidEvent(eventName, bizSession, events)) {
      return false;
    }

    const progress =
      events?.flow_step_progress !== undefined
        ? getEventProgress(eventName, events.flow_step_progress)
        : undefined;
    const state = getEventState(eventName);

    return await this.prisma.$transaction(async (tx) => {
      const insert = {
        bizUserId: user.id,
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
          contentId: currentVersion.contentId,
          cvid: events[EventAttributes.QUESTION_CVID],
          versionId: currentVersion.id,
          bizUserId: user.id,
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
  }
}
