import { AttributeBizType } from '@/attributes/models/attribute.model';
import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import { createConditionsFilter } from '@/common/attribute/filter';
import { evaluateAttributeCondition, isArray, isNullish } from '@usertour/helpers';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { BizUser, Environment, Step, Attribute } from '@/common/types/schema';
import {
  BizEvents,
  RulesCondition,
  ChecklistData,
  ContentConditionLogic,
  RulesType,
  RulesEvaluationOptions,
  StepTrigger,
  SimpleAttribute,
  AttributeBizTypes,
  BizAttributeTypes,
} from '@usertour/types';

// ============================================================================
// Type Definitions
// ============================================================================

type SegmentDataItem = {
  data: {
    logic: string;
    attrId: string;
  };
  type: 'user-attr';
  operators: 'and' | 'or';
};

/**
 * Filter object structure for Prisma queries
 * Contains AND/OR conditions for attribute-based filtering
 */
type ConditionsFilter = {
  AND?: any[];
  OR?: any[];
};

/**
 * Segment filters grouped by business type
 * Only contains valid filter objects (false values are filtered out in buildSegmentFilters)
 */
type SegmentFilters = {
  company?: ConditionsFilter;
  user?: ConditionsFilter;
  membership?: ConditionsFilter;
};

/**
 * Context for condition evaluation containing all required data
 * Provides a unified interface for passing evaluation parameters
 */
export type ConditionEvaluationContext = {
  readonly environment: Environment;
  readonly attributes: Attribute[];
  readonly bizUser: BizUser;
  readonly externalCompanyId?: string;
};

/**
 * Parameters for event-based content condition evaluation
 */
type ContentConditionParams = {
  contentId: string;
  bizUserId: string;
  logic: string;
};

// ============================================================================
// Service Class
// ============================================================================

/**
 * Service responsible for evaluating all types of conditions
 * Handles user attributes, segments, content conditions, and checklist/step triggers
 */
@Injectable()
export class ConditionEvaluationService {
  private readonly logger = new Logger(ConditionEvaluationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Evaluate rules conditions and return updated conditions
   * @param rulesConditions - Array of rules conditions to evaluate
   * @param context - Condition evaluation context
   * @returns Updated rules conditions with evaluated conditions
   */
  async evaluateRulesConditions(
    rulesConditions: RulesCondition[],
    context: ConditionEvaluationContext,
  ): Promise<RulesCondition[]> {
    return await Promise.all(
      rulesConditions.map(async (rules) => {
        // Handle group conditions recursively
        if (rules.type === 'group' && rules.conditions) {
          const evaluatedSubConditions = await this.evaluateRulesConditions(
            rules.conditions,
            context,
          );
          return {
            ...rules,
            conditions: evaluatedSubConditions,
          };
        }

        // Evaluate single condition
        const isActivated = await this.evaluateCondition(rules, context);

        return {
          ...rules,
          actived: isActivated,
        };
      }),
    );
  }

  /**
   * Evaluate checklist conditions and return updated items
   * @param data - Checklist data containing items and conditions
   * @param context - Condition evaluation context
   * @returns Updated checklist data with evaluated conditions
   */
  async evaluateChecklistConditions(
    data: ChecklistData,
    context: ConditionEvaluationContext,
  ): Promise<ChecklistData> {
    const items = await Promise.all(
      data.items.map(async (item) => {
        const completeConditions = item.completeConditions
          ? await this.evaluateRulesConditions(item.completeConditions, context)
          : [];
        const onlyShowTaskConditions = item.onlyShowTaskConditions
          ? await this.evaluateRulesConditions(item.onlyShowTaskConditions, context)
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
   * @param context - Condition evaluation context
   * @returns Updated steps with evaluated conditions
   */
  async evaluateStepTriggers(steps: Step[], context: ConditionEvaluationContext): Promise<Step[]> {
    return await Promise.all(
      steps.map(async (step) => {
        // Skip if no triggers
        if (!step.trigger || !isArray(step.trigger)) {
          return step;
        }

        // Evaluate all triggers in parallel
        const triggers = step.trigger as StepTrigger[];
        const evaluatedTriggers = await Promise.all(
          triggers.map(async (triggerItem: StepTrigger) =>
            this.evaluateSingleTrigger(triggerItem, context),
          ),
        );

        return {
          ...step,
          trigger: evaluatedTriggers,
        };
      }),
    );
  }

  // ============================================================================
  // Private: Core Condition Evaluation
  // ============================================================================

  /**
   * Evaluate a single condition and return if it is activated
   * @param rules - The condition to evaluate
   * @param context - Condition evaluation context
   * @returns boolean indicating if the condition is activated
   */
  private async evaluateCondition(
    rules: RulesCondition,
    context: ConditionEvaluationContext,
  ): Promise<boolean> {
    switch (rules.type) {
      case RulesType.USER_ATTR: {
        return await this.evaluateUserAttributeCondition(rules, context);
      }
      case RulesType.SEGMENT: {
        return await this.evaluateSegmentCondition(rules, context);
      }
      case RulesType.CONTENT: {
        return await this.evaluateContentCondition(rules, context);
      }
      default: {
        return false;
      }
    }
  }

  /**
   * Evaluate a single trigger and return updated trigger with evaluated conditions
   * @param triggerItem - The trigger item to evaluate
   * @param context - Condition evaluation context
   * @returns Updated trigger with evaluated conditions, or original triggerItem if invalid
   */
  private async evaluateSingleTrigger(
    triggerItem: StepTrigger,
    context: ConditionEvaluationContext,
  ): Promise<StepTrigger> {
    // Type guard: ensure trigger is an object with conditions
    if (isNullish(triggerItem) || !isArray(triggerItem.conditions)) {
      return triggerItem;
    }

    const evaluatedConditions = await this.evaluateRulesConditions(triggerItem.conditions, context);

    return {
      ...triggerItem,
      conditions: evaluatedConditions,
    };
  }

  // ============================================================================
  // Private: User Attribute Evaluation
  // ============================================================================

  /**
   * Evaluate user attribute condition
   * @param rules - The condition to evaluate
   * @param context - Condition evaluation context
   * @returns boolean indicating if the condition is activated
   */
  private async evaluateUserAttributeCondition(
    rules: RulesCondition,
    context: ConditionEvaluationContext,
  ): Promise<boolean> {
    const attr = context.attributes.find((attr) => attr.id === rules.data.attrId);
    if (!attr) {
      return false;
    }

    const evaluationOptions = await this.buildEvaluationOptions(attr.bizType, context);

    if (!evaluationOptions) {
      return false;
    }

    return evaluateAttributeCondition(rules, evaluationOptions);
  }

  /**
   * Build complete RulesEvaluationOptions with all required attributes
   * @param bizType - Business type of the attribute
   * @param context - Condition evaluation context
   * @returns Evaluation options or null if context is invalid
   */
  private async buildEvaluationOptions(
    bizType: AttributeBizType,
    context: ConditionEvaluationContext,
  ): Promise<RulesEvaluationOptions | null> {
    const userAttributes = (context.bizUser.data as Record<string, any>) || {};

    // Convert Attribute[] to SimpleAttribute[] for RulesEvaluationOptions
    // AttributeBizType and AttributeBizTypes have the same numeric values (1, 2, 3)
    const simpleAttributes: SimpleAttribute[] = context.attributes.map((attr) => ({
      id: attr.id,
      codeName: attr.codeName,
      dataType: attr.dataType as BizAttributeTypes,
      bizType: attr.bizType as AttributeBizTypes, // Cast to AttributeBizTypes for evaluateAttributeCondition
    }));

    // USER type doesn't require company context
    if (bizType === AttributeBizType.USER) {
      return {
        attributes: simpleAttributes,
        userAttributes,
      };
    }

    // COMPANY and MEMBERSHIP types require company context
    if (!context.externalCompanyId) {
      return null;
    }

    const userOnCompany = await this.findUserCompanyRelation(context);

    if (!userOnCompany || !userOnCompany.bizCompany) {
      return null;
    }

    const companyAttributes = (userOnCompany.bizCompany.data as Record<string, any>) || {};
    const membershipAttributes = (userOnCompany.data as Record<string, any>) || {};

    return {
      attributes: simpleAttributes,
      userAttributes,
      companyAttributes,
      membershipAttributes,
    };
  }

  // ============================================================================
  // Private: Segment Evaluation
  // ============================================================================

  /**
   * Evaluate segment condition (unified handler for both user and company segments)
   * @param rules - The condition to evaluate
   * @param context - Condition evaluation context
   * @returns boolean indicating if the condition is activated
   */
  private async evaluateSegmentCondition(
    rules: RulesCondition,
    context: ConditionEvaluationContext,
  ): Promise<boolean> {
    const { segmentId } = rules.data;
    const segment = await this.findSegmentById(segmentId);

    if (!segment) {
      return false;
    }

    // Route to appropriate segment evaluator based on segment business type
    if (segment.bizType === SegmentBizType.USER) {
      const userAttrs = context.attributes.filter((attr) => attr.bizType === AttributeBizType.USER);
      return await this.evaluateUserSegmentCondition(rules, segment, context, userAttrs);
    }

    if (segment.bizType === SegmentBizType.COMPANY && context.externalCompanyId) {
      return await this.evaluateCompanySegmentCondition(rules, segment, context);
    }

    return false;
  }

  /**
   * Evaluate user segment condition
   * @param rules - The condition to evaluate
   * @param segment - The segment (already fetched)
   * @param context - Condition evaluation context
   * @param userAttrs - Filtered user attributes
   * @returns boolean indicating if the condition is activated
   */
  private async evaluateUserSegmentCondition(
    rules: RulesCondition,
    segment: { id: string; dataType: number; data: any },
    context: ConditionEvaluationContext,
    userAttrs: Attribute[],
  ): Promise<boolean> {
    const { logic = 'is' } = rules.data;

    switch (segment.dataType) {
      case SegmentDataType.ALL: {
        return logic === 'is';
      }
      case SegmentDataType.MANUAL: {
        const userOnSegment = await this.prisma.bizUserOnSegment.findFirst({
          where: { segmentId: segment.id, bizUserId: context.bizUser.id },
        });
        return this.applySegmentLogic(logic, !!userOnSegment);
      }
      case SegmentDataType.CONDITION: {
        const filter = createConditionsFilter(segment.data, userAttrs);
        const segmentUser = await this.prisma.bizUser.findFirst({
          where: {
            environmentId: context.environment.id,
            externalId: String(context.bizUser.externalId),
            ...filter,
          },
        });
        return this.applySegmentLogic(logic, !!segmentUser);
      }
      default: {
        this.logger.warn(`Unknown segment data type: ${segment.dataType}`);
        return false;
      }
    }
  }

  /**
   * Evaluate company segment condition
   * @param rules - The condition to evaluate
   * @param segment - The segment (already fetched)
   * @param context - Condition evaluation context
   * @returns boolean indicating if the condition is activated
   */
  private async evaluateCompanySegmentCondition(
    rules: RulesCondition,
    segment: { id: string; dataType: number; data: any },
    context: ConditionEvaluationContext,
  ): Promise<boolean> {
    const { logic = 'is' } = rules.data;

    if (!context.externalCompanyId) {
      return false;
    }

    // Verify company exists and user-company relationship in one query
    const userCompanyRelation = await this.findUserCompanyRelation(context);

    if (!userCompanyRelation) {
      return false;
    }

    const bizCompany = userCompanyRelation.bizCompany;

    // Evaluate based on segment data type
    switch (segment.dataType) {
      case SegmentDataType.ALL: {
        return logic === 'is';
      }
      case SegmentDataType.MANUAL: {
        const companyOnSegment = await this.prisma.bizCompanyOnSegment.findFirst({
          where: { segmentId: segment.id, bizCompanyId: bizCompany.id },
        });
        return this.applySegmentLogic(logic, !!companyOnSegment);
      }
      case SegmentDataType.CONDITION: {
        const found = await this.findCompanyBySegmentConditions(
          segment,
          context.attributes,
          bizCompany,
          context.environment,
        );
        return this.applySegmentLogic(logic, found);
      }
      default: {
        this.logger.warn(`Unknown segment data type: ${segment.dataType}`);
        return false;
      }
    }
  }

  /**
   * Apply segment logic (is/not) to the result
   * @param logic - The logic operator ('is' or 'not')
   * @param result - The evaluation result
   * @returns The final boolean result
   */
  private applySegmentLogic(logic: string, result: boolean): boolean {
    return logic === 'is' ? result : !result;
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
    segment: { id: string; dataType: number; data: any },
    attributes: Attribute[],
    bizCompany: { id: string },
    environment: Environment,
  ): Promise<boolean> {
    // Early return if segment is not condition-based
    if (segment.dataType !== SegmentDataType.CONDITION) {
      return false;
    }

    const segmentData = segment.data as unknown as SegmentDataItem[];
    if (!isArray(segmentData) || segmentData.length === 0) {
      return false;
    }

    // Build filters for all business types
    const filters = this.buildSegmentFilters(segmentData, attributes);

    // Query with combined filters
    const segmentItem = await this.prisma.bizUserOnCompany.findFirst({
      where: {
        ...(filters.membership ? filters.membership : {}),
        bizCompany: {
          id: bizCompany.id,
          environmentId: environment.id,
          ...(filters.company ? filters.company : {}),
        },
        ...(filters.user ? { bizUser: filters.user } : {}),
      },
    });

    return !!segmentItem;
  }

  /**
   * Build filters for company segment conditions by business type
   * @param segmentData - Segment data items
   * @param attributes - Available attributes
   * @returns Object containing filters for company, user, and membership types
   */
  private buildSegmentFilters(
    segmentData: SegmentDataItem[],
    attributes: Attribute[],
  ): SegmentFilters {
    const bizTypes = [
      { type: AttributeBizType.COMPANY, key: 'company' as const },
      { type: AttributeBizType.USER, key: 'user' as const },
      { type: AttributeBizType.MEMBERSHIP, key: 'membership' as const },
    ] as const;

    const filters: SegmentFilters = {};

    for (const { type, key } of bizTypes) {
      const conditions = this.filterConditionsByBizType(segmentData, attributes, type);
      const filter = createConditionsFilter(conditions, attributes);
      if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
        filters[key] = filter;
      }
    }

    return filters;
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

  // ============================================================================
  // Private: Content Evaluation
  // ============================================================================

  /**
   * Evaluate content condition
   * @param rules - The condition to evaluate
   * @param context - Condition evaluation context
   * @returns boolean indicating if the condition is activated
   */
  private async evaluateContentCondition(
    rules: RulesCondition,
    context: ConditionEvaluationContext,
  ): Promise<boolean> {
    const { contentId, logic } = rules.data;

    if (!contentId || !logic) {
      return false;
    }

    const conditionParams: ContentConditionParams = {
      contentId,
      bizUserId: context.bizUser.id,
      logic,
    };

    // Handle activation status conditions
    if (this.isActivationLogic(logic)) {
      return await this.evaluateActivationCondition(conditionParams);
    }

    // Handle seen status conditions
    if (this.isSeenLogic(logic)) {
      return await this.evaluateSeenCondition(conditionParams);
    }

    // Handle completion status conditions
    if (this.isCompletedLogic(logic)) {
      return await this.evaluateCompletedCondition(conditionParams);
    }

    this.logger.warn(`Unknown content condition logic: ${logic}`);
    return false;
  }

  /**
   * Check if logic is activation-related
   */
  private isActivationLogic(logic: string): boolean {
    return logic === ContentConditionLogic.ACTIVED || logic === ContentConditionLogic.UNACTIVED;
  }

  /**
   * Check if logic is seen-related
   */
  private isSeenLogic(logic: string): boolean {
    return logic === ContentConditionLogic.SEEN || logic === ContentConditionLogic.UNSEEN;
  }

  /**
   * Check if logic is completion-related
   */
  private isCompletedLogic(logic: string): boolean {
    return logic === ContentConditionLogic.COMPLETED || logic === ContentConditionLogic.UNCOMPLETED;
  }

  /**
   * Evaluate activation condition (activated/unactivated)
   */
  private async evaluateActivationCondition(params: ContentConditionParams): Promise<boolean> {
    const { contentId, bizUserId, logic } = params;
    const hasSession = await this.hasAvailableSession(contentId, bizUserId);
    return logic === ContentConditionLogic.ACTIVED ? hasSession : !hasSession;
  }

  /**
   * Evaluate seen condition (seen/unseen)
   */
  private async evaluateSeenCondition(params: ContentConditionParams): Promise<boolean> {
    const { contentId, bizUserId, logic } = params;
    const hasSeen = await this.hasBizEvent(contentId, bizUserId, BizEvents.FLOW_STEP_SEEN);
    return logic === ContentConditionLogic.SEEN ? hasSeen : !hasSeen;
  }

  /**
   * Evaluate completed condition (completed/uncompleted)
   */
  private async evaluateCompletedCondition(params: ContentConditionParams): Promise<boolean> {
    const { contentId, bizUserId, logic } = params;
    const hasCompleted = await this.hasBizEvent(contentId, bizUserId, BizEvents.FLOW_COMPLETED);
    return logic === ContentConditionLogic.COMPLETED ? hasCompleted : !hasCompleted;
  }

  // ============================================================================
  // Private: Data Access Helpers
  // ============================================================================

  /**
   * Find segment by ID
   * @param segmentId - The segment ID
   * @returns The segment or null if not found
   */
  private async findSegmentById(segmentId: string) {
    return await this.prisma.segment.findFirst({
      where: { id: segmentId },
    });
  }

  /**
   * Find user-company relationship with company included
   * @param context - Condition evaluation context
   * @returns User-company relationship with company, or null if not found
   */
  private async findUserCompanyRelation(context: ConditionEvaluationContext) {
    return await this.prisma.bizUserOnCompany.findFirst({
      where: {
        bizUserId: context.bizUser.id,
        bizCompany: {
          externalId: String(context.externalCompanyId),
          environmentId: context.environment.id,
        },
      },
      include: {
        bizCompany: true,
      },
    });
  }

  /**
   * Check if there is an available session for a content and user
   * @param contentId - The ID of the content
   * @param bizUserId - The ID of the business user
   * @returns true if an available session exists, false otherwise
   */
  private async hasAvailableSession(contentId: string, bizUserId: string): Promise<boolean> {
    const count = await this.prisma.bizSession.count({
      where: { contentId, bizUserId, deleted: false, state: 0 },
    });
    return count > 0;
  }

  /**
   * Check if the user has a biz event
   * @param contentId - The ID of the content
   * @param bizUserId - The ID of the business user
   * @param eventCodeName - The code name of the event
   * @returns true if the user has the event, false otherwise
   */
  private async hasBizEvent(
    contentId: string,
    bizUserId: string,
    eventCodeName: string,
  ): Promise<boolean> {
    const count = await this.prisma.bizSession.count({
      where: {
        contentId,
        bizUserId,
        deleted: false,
        bizEvent: { some: { event: { codeName: eventCodeName } } },
      },
    });
    return count > 0;
  }
}
