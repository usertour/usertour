import { AttributeBizType } from '@/attributes/models/attribute.model';
import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import {
  CompanyScan,
  createBizCompanyConditionsFilter,
  createBizUserConditionsFilter,
  createConditionsFilter,
} from '@/common/attribute/filter';
import { ProjectCacheService } from '@/shared/project-cache.service';
import {
  evaluateAttributeCondition,
  isArray,
  isNullish,
  isConditionsActived,
} from '@usertour/helpers';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { BizUser, Environment, Step, Attribute } from '@/common/types/schema';
import {
  BizEvents,
  RulesCondition,
  ChecklistData,
  ContentConditionLogic,
  ResourceCenterBlockType,
  ResourceCenterData,
  RulesType,
  RulesEvaluationOptions,
  StepTrigger,
  SimpleAttribute,
  AttributeBizTypes,
  BizAttributeTypes,
  EventConditionData,
  EventCountLogic,
  EventTimeLogic,
  EventTimeUnit,
  EventScope,
} from '@usertour/types';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * The auto-start-rules slice of a version's `config` JSON that gates visibility
 * ("Only show if..."). Shared by the announcement read paths so the targeting
 * contract lives in one place instead of being re-declared per caller.
 */
export type AutoStartRulesConfig = {
  enabledAutoStartRules?: boolean;
  autoStartRules?: RulesCondition[];
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: ProjectCacheService,
  ) {}

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
   * Decide whether a content's auto-start (targeting) rules make it visible to
   * the user in `context`. Used to gate announcements server-side so a
   * targeted announcement ("Only show if...") is not leaked to users who don't
   * match. Mirrors how resource-center block / checklist visibility conditions
   * are evaluated — same DB-backed user-attr / segment / time evaluation.
   *
   * Returns true when targeting is disabled or there are no conditions.
   */
  async isVisibleByAutoStartRules(
    config: AutoStartRulesConfig | null | undefined,
    context: ConditionEvaluationContext,
  ): Promise<boolean> {
    if (!config?.enabledAutoStartRules || !config.autoStartRules?.length) {
      return true;
    }
    const evaluated = await this.evaluateRulesConditions(config.autoStartRules, context);
    return isConditionsActived(evaluated);
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
   * Evaluate resource center conditions and return updated tabs/blocks
   * @param data - Resource center data containing tabs and blocks
   * @param context - Condition evaluation context
   * @returns Updated resource center data with evaluated onlyShowBlockConditions
   */
  async evaluateResourceCenterConditions(
    data: ResourceCenterData,
    context: ConditionEvaluationContext,
  ): Promise<ResourceCenterData> {
    const tabs = await Promise.all(
      data.tabs.map(async (tab) => {
        const blocks = await Promise.all(
          tab.blocks.map(async (block) => {
            const onlyShowBlockConditions = block.onlyShowBlockConditions
              ? await this.evaluateRulesConditions(block.onlyShowBlockConditions, context)
              : [];
            if (block.type === ResourceCenterBlockType.CONTENT_LIST) {
              const contentItems = await Promise.all(
                block.contentItems.map(async (item) => {
                  const onlyShowItemConditions = item.onlyShowItemConditions
                    ? await this.evaluateRulesConditions(item.onlyShowItemConditions, context)
                    : [];
                  return { ...item, onlyShowItemConditions };
                }),
              );
              return { ...block, onlyShowBlockConditions, contentItems };
            }
            return { ...block, onlyShowBlockConditions };
          }),
        );
        return { ...tab, blocks };
      }),
    );

    return { ...data, tabs };
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
        // Evaluate triggers if present
        let triggers = step.trigger;
        if (triggers && isArray(triggers)) {
          const triggerArray = triggers as StepTrigger[];
          triggers = await Promise.all(
            triggerArray.map(async (triggerItem: StepTrigger) =>
              this.evaluateSingleTrigger(triggerItem, context),
            ),
          );
        }

        return {
          ...step,
          trigger: triggers,
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
      case RulesType.EVENT: {
        return await this.evaluateEventCondition(rules, context);
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
      return await this.evaluateUserSegmentCondition(rules, segment, context);
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
   * @returns boolean indicating if the condition is activated
   */
  private async evaluateUserSegmentCondition(
    rules: RulesCondition,
    segment: { id: string; dataType: number; data: any },
    context: ConditionEvaluationContext,
  ): Promise<boolean> {
    const { logic = 'is' } = rules.data;

    switch (segment.dataType) {
      case SegmentDataType.ALL: {
        return logic === 'is';
      }
      case SegmentDataType.MANUAL: {
        const userOnSegment = await this.cache.memoize(
          this.cache.memoKeys.bizUserOnSegment(segment.id, context.bizUser.id),
          () =>
            this.prisma.bizUserOnSegment.findFirst({
              where: { segmentId: segment.id, bizUserId: context.bizUser.id },
            }),
        );
        return this.applySegmentLogic(logic, !!userOnSegment);
      }
      case SegmentDataType.CONDITION: {
        // At runtime, company/membership leaves in the segment's conditions
        // are bound to the session's current company — the same binding every
        // other company-scoped predicate uses — and evaluate to false when
        // the session has no company.
        const companyScan: CompanyScan = context.externalCompanyId
          ? {
              type: 'current',
              bizCompanyWhere: {
                externalId: String(context.externalCompanyId),
                environmentId: context.environment.id,
              },
            }
          : { type: 'none' };
        const filter = createBizUserConditionsFilter(segment.data, context.attributes, companyScan);
        const segmentUser = await this.prisma.bizUser.findFirst({
          where: {
            environmentId: context.environment.id,
            externalId: String(context.bizUser.externalId),
            ...(filter ? { AND: [filter] } : {}),
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
        const companyOnSegment = await this.cache.memoize(
          this.cache.memoKeys.bizCompanyOnSegment(segment.id, bizCompany.id),
          () =>
            this.prisma.bizCompanyOnSegment.findFirst({
              where: { segmentId: segment.id, bizCompanyId: bizCompany.id },
            }),
        );
        return this.applySegmentLogic(logic, !!companyOnSegment);
      }
      case SegmentDataType.CONDITION: {
        // User/membership leaves in the segment's conditions are bound to the
        // company's memberships by the compiled filter (one member satisfying
        // the whole tree); company leaves describe the company row itself.
        const filter = createBizCompanyConditionsFilter(segment.data, context.attributes);
        const found = await this.prisma.bizCompany.findFirst({
          where: {
            id: bizCompany.id,
            environmentId: context.environment.id,
            ...(filter ? { AND: [filter] } : {}),
          },
        });
        return this.applySegmentLogic(logic, !!found);
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
    const hasSeen = await this.hasBizEvent(contentId, bizUserId, [
      BizEvents.FLOW_STEP_SEEN,
      BizEvents.CHECKLIST_SEEN,
    ]);
    return logic === ContentConditionLogic.SEEN ? hasSeen : !hasSeen;
  }

  /**
   * Evaluate completed condition (completed/uncompleted)
   */
  private async evaluateCompletedCondition(params: ContentConditionParams): Promise<boolean> {
    const { contentId, bizUserId, logic } = params;
    const hasCompleted = await this.hasBizEvent(contentId, bizUserId, [
      BizEvents.FLOW_COMPLETED,
      BizEvents.CHECKLIST_COMPLETED,
    ]);
    return logic === ContentConditionLogic.COMPLETED ? hasCompleted : !hasCompleted;
  }

  // ============================================================================
  // Private: Data Access Helpers
  // ============================================================================

  /**
   * Find segment by ID, memoized per request scope. Same segment id can be
   * referenced by multiple version conditions across the 6-type
   * toggleContents loop; without memo each evaluation reissues findFirst.
   */
  private async findSegmentById(segmentId: string) {
    return this.cache.memoize(this.cache.memoKeys.segment(segmentId), () =>
      this.prisma.segment.findFirst({
        where: { id: segmentId },
      }),
    );
  }

  /**
   * Find user-company relationship with company included.
   * Memoized per request scope so repeated condition evaluations across the
   * 6-type toggleContents loop don't all re-query the same membership row.
   * Distinct namespace from `bizUserOnCompany` because the included
   * `bizCompany` shape differs from the bare row.
   */
  private async findUserCompanyRelation(context: ConditionEvaluationContext) {
    return this.cache.memoize(
      this.cache.memoKeys.bizUserOnCompanyWithBizCompany(
        context.bizUser.id,
        context.environment.id,
        String(context.externalCompanyId),
      ),
      () =>
        this.prisma.bizUserOnCompany.findFirst({
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
        }),
    );
  }

  /**
   * Check if there is an available session for a content and user.
   *
   * NOT memoized: toggleContents may create new BizSessions mid-EndBatch
   * (one content type's auto-start fires, then another type's rules ask
   * "is content X activated?"), and a memo'd pre-creation `false` would
   * mask the just-created session. The repeated calls within one
   * evaluation pass hit a hot DB row anyway — cheaper than getting the
   * answer wrong.
   */
  private async hasAvailableSession(contentId: string, bizUserId: string): Promise<boolean> {
    const count = await this.prisma.bizSession.count({
      where: { contentId, bizUserId, deleted: false, state: 0 },
    });
    return count > 0;
  }

  /**
   * Check if the user has a biz event.
   *
   * NOT memoized for the same reason as hasAvailableSession: trackBizEvent
   * fires SEEN / COMPLETED events as toggleContents progresses, and a
   * memo'd pre-event `false` would hide the new event from later rules.
   */
  private async hasBizEvent(
    contentId: string,
    bizUserId: string,
    eventCodeName: string[],
  ): Promise<boolean> {
    if (!eventCodeName || eventCodeName.length === 0) {
      return false;
    }
    const count = await this.prisma.bizSession.count({
      where: {
        contentId,
        bizUserId,
        deleted: false,
        bizEvent: { some: { event: { codeName: { in: eventCodeName } } } },
      },
    });
    return count > 0;
  }

  // ============================================================================
  // Private: Event Condition Evaluation
  // ============================================================================

  /**
   * Evaluate event condition
   * Counts matching BizEvent records based on scope, time window, and where conditions,
   * then applies count logic (at least, at most, exactly, between).
   */
  private async evaluateEventCondition(
    rules: RulesCondition,
    context: ConditionEvaluationContext,
  ): Promise<boolean> {
    const data = rules.data as EventConditionData & { whereConditions?: RulesCondition[] };
    if (!data?.eventId) {
      return false;
    }

    // Build the base where clause for BizEvent
    const whereClause: any = {
      eventId: data.eventId,
    };

    // Apply scope filter
    const scopeFilter = this.buildEventScopeFilter(data.scope, context);
    if (scopeFilter === null) {
      // Scope requires company context but none is available
      return false;
    }
    Object.assign(whereClause, scopeFilter);

    // Apply time window filter
    const timeFilter = this.buildEventTimeFilter(data);
    if (timeFilter) {
      whereClause.createdAt = timeFilter;
    }

    // Apply where conditions (event attribute filters)
    if (data.whereConditions && data.whereConditions.length > 0) {
      const attrFilter = this.buildEventAttributeFilter(data.whereConditions, context);
      if (attrFilter) {
        Object.assign(whereClause, attrFilter);
      }
    }

    // Count matching events
    const eventCount = await this.prisma.bizEvent.count({
      where: whereClause,
    });

    // Apply count logic
    return this.applyEventCountLogic(data, eventCount);
  }

  /**
   * Build scope filter for event condition query
   * Returns null if scope requires company context but none is available
   */
  private buildEventScopeFilter(
    scope: EventScope | undefined,
    context: ConditionEvaluationContext,
  ): Record<string, any> | null {
    switch (scope) {
      case EventScope.BY_CURRENT_USER_IN_CURRENT_COMPANY: {
        if (!context.externalCompanyId) {
          return null;
        }
        return {
          bizUserId: context.bizUser.id,
          bizCompany: {
            externalId: String(context.externalCompanyId),
            environmentId: context.environment.id,
          },
        };
      }
      case EventScope.BY_ANY_USER_IN_CURRENT_COMPANY: {
        if (!context.externalCompanyId) {
          return null;
        }
        return {
          bizCompany: {
            externalId: String(context.externalCompanyId),
            environmentId: context.environment.id,
          },
        };
      }
      default: {
        return {
          bizUserId: context.bizUser.id,
        };
      }
    }
  }

  /**
   * Build time filter for event condition query
   */
  private buildEventTimeFilter(data: EventConditionData): Record<string, Date> | undefined {
    const now = new Date();

    switch (data.timeLogic) {
      case EventTimeLogic.IN_THE_LAST: {
        if (data.windowValue === undefined || data.windowValue === null) return undefined;
        const startDate = new Date(
          now.getTime() - this.toMilliseconds(data.windowValue, data.timeUnit),
        );
        return { gte: startDate };
      }
      case EventTimeLogic.MORE_THAN: {
        if (data.windowValue === undefined || data.windowValue === null) return undefined;
        const cutoff = new Date(
          now.getTime() - this.toMilliseconds(data.windowValue, data.timeUnit),
        );
        return { lte: cutoff };
      }
      case EventTimeLogic.BETWEEN: {
        if (
          data.windowValue === undefined ||
          data.windowValue === null ||
          data.windowValue2 === undefined ||
          data.windowValue2 === null
        ) {
          return undefined;
        }
        const start = new Date(
          now.getTime() -
            this.toMilliseconds(Math.max(data.windowValue, data.windowValue2), data.timeUnit),
        );
        const end = new Date(
          now.getTime() -
            this.toMilliseconds(Math.min(data.windowValue, data.windowValue2), data.timeUnit),
        );
        return { gte: start, lte: end };
      }
      default: {
        return undefined;
      }
    }
  }

  /**
   * Convert a value + unit to milliseconds
   */
  private toMilliseconds(value: number, unit: EventTimeUnit | undefined): number {
    switch (unit) {
      case EventTimeUnit.SECONDS:
        return value * 1000;
      case EventTimeUnit.MINUTES:
        return value * 60 * 1000;
      case EventTimeUnit.HOURS:
        return value * 60 * 60 * 1000;
      case EventTimeUnit.DAYS:
        return value * 24 * 60 * 60 * 1000;
      default:
        return value * 24 * 60 * 60 * 1000; // Default to days
    }
  }

  /**
   * Apply count logic to compare event count against the condition criteria
   */
  private applyEventCountLogic(data: EventConditionData, eventCount: number): boolean {
    const count = data.count ?? 0;
    const count2 = data.count2 ?? 0;

    switch (data.countLogic) {
      case EventCountLogic.AT_LEAST:
        return eventCount >= count;
      case EventCountLogic.AT_MOST:
        return eventCount <= count;
      case EventCountLogic.EXACTLY:
        return eventCount === count;
      case EventCountLogic.BETWEEN:
        return eventCount >= Math.min(count, count2) && eventCount <= Math.max(count, count2);
      default:
        return eventCount >= count;
    }
  }

  /**
   * Build Prisma JSON filter for event attribute conditions.
   * Reuses createConditionsFilter from @/common/attribute/filter which already
   * handles all data types (String, Number, Boolean, List, DateTime) including
   * DateTime-specific logics: lessThan, exactly, moreThan, before, on, after.
   */
  private buildEventAttributeFilter(
    whereConditions: RulesCondition[],
    context: ConditionEvaluationContext,
  ): Record<string, any> | undefined {
    if (!whereConditions || whereConditions.length === 0) {
      return undefined;
    }

    const filter = createConditionsFilter(whereConditions, context.attributes);
    if (!filter || (typeof filter === 'object' && Object.keys(filter).length === 0)) {
      return undefined;
    }

    return filter as Record<string, any>;
  }
}
