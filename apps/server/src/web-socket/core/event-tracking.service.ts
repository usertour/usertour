import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { getEventProgress, getEventState, isValidEvent } from '@/utils/event-v2';
import {
  BizEvents,
  CompanyAttributes,
  ContentDataType,
  EventAttributes,
  UserAttributes,
  ClientContext,
  StepSettings,
} from '@usertour/types';
import {
  BizCompany,
  BizSession,
  BizEvent,
  BizUser,
  Environment,
  Event,
  VersionWithSteps,
  Step,
} from '@/common/types/schema';
import { CustomContentVersion } from '@/common/types/content';
import { deepmerge } from 'deepmerge-ts';

@Injectable()
export class EventTrackingService {
  private readonly logger = new Logger(EventTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Filter event data based on allowed attributes for the event
   * @param eventId - The ID of the event
   * @param data - The raw event data to filter
   * @returns The filtered event data or false if no valid attributes found
   */
  private async filterEventDataByAttributes(
    eventId: string,
    data: Record<string, any>,
  ): Promise<Record<string, any> | false> {
    // Early return if no data provided
    if (!data || Object.keys(data).length === 0) {
      return false;
    }

    // Fetch event attributes with optimized query
    const attributes = await this.prisma.attributeOnEvent.findMany({
      where: { eventId },
      select: {
        attribute: {
          select: {
            codeName: true,
          },
        },
      },
    });

    if (!attributes?.length) {
      return false;
    }

    // Create a Set for O(1) lookup performance instead of O(n) find
    const allowedAttributeNames = new Set(attributes.map((attr) => attr.attribute.codeName));

    // Filter data using efficient Set lookup
    const filteredData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (allowedAttributeNames.has(key)) {
        filteredData[key] = value;
      }
    }

    // Return filtered data only if we have valid attributes
    return Object.keys(filteredData).length > 0 ? filteredData : false;
  }

  /**
   * Update seen attributes for a data record
   * @param data - Current data record
   * @param firstSeenKey - Key for first seen timestamp
   * @param lastSeenKey - Key for last seen timestamp
   * @param currentTime - Current timestamp
   * @returns Updated data with seen attributes
   */
  private updateSeenAttributesData(
    data: Record<string, unknown>,
    firstSeenKey: string,
    lastSeenKey: string,
    currentTime: string,
  ): Record<string, unknown> {
    const isFirstEvent = !data[firstSeenKey];

    return {
      ...data,
      [lastSeenKey]: currentTime,
      ...(isFirstEvent && { [firstSeenKey]: currentTime }),
    };
  }

  /**
   * Update user seen attributes
   * @param tx - Database transaction
   * @param user - Business user
   * @param currentTime - Current timestamp
   * @returns Promise for user update operation
   */
  private updateUserSeenAttributes(
    tx: Prisma.TransactionClient,
    user: BizUser,
    currentTime: string,
  ): Promise<BizUser> {
    const userData = (user.data as Record<string, unknown>) || {};
    const updatedUserData = this.updateSeenAttributesData(
      userData,
      UserAttributes.FIRST_SEEN_AT,
      UserAttributes.LAST_SEEN_AT,
      currentTime,
    );

    return tx.bizUser.update({
      where: { id: user.id },
      data: { data: updatedUserData as any },
    });
  }

  /**
   * Update company seen attributes if company exists
   * @param tx - Database transaction
   * @param bizCompanyId - Business company ID
   * @param currentTime - Current timestamp
   * @returns Promise for company update operation or null
   */
  private async updateCompanySeenAttributes(
    tx: Prisma.TransactionClient,
    bizCompanyId: string,
    currentTime: string,
  ): Promise<BizCompany | null> {
    const company = await tx.bizCompany.findUnique({
      where: { id: bizCompanyId },
    });

    if (!company) {
      return null;
    }

    const companyData = (company.data as Record<string, unknown>) || {};
    const updatedCompanyData = this.updateSeenAttributesData(
      companyData,
      CompanyAttributes.FIRST_SEEN_AT,
      CompanyAttributes.LAST_SEEN_AT,
      currentTime,
    );

    return tx.bizCompany.update({
      where: { id: company.id },
      data: { data: updatedCompanyData as any },
    });
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
    const currentTime = new Date().toISOString();

    // Prepare update operations
    const updateOperations: Promise<BizUser | BizCompany | null>[] = [
      this.updateUserSeenAttributes(tx, user, currentTime),
    ];

    // Add company update operation if company exists
    if (bizSession.bizCompanyId) {
      updateOperations.push(
        this.updateCompanySeenAttributes(tx, bizSession.bizCompanyId, currentTime),
      );
    }

    // Execute all updates in parallel within the transaction
    await Promise.all(updateOperations);
  }

  /**
   * Enrich event data with socket context
   */
  private enrichEventData(data: Record<string, unknown>, clientContext: ClientContext) {
    return clientContext
      ? {
          ...data,
          [EventAttributes.PAGE_URL]: clientContext.pageUrl,
          [EventAttributes.VIEWPORT_WIDTH]: clientContext.viewportWidth,
          [EventAttributes.VIEWPORT_HEIGHT]: clientContext.viewportHeight,
        }
      : data;
  }

  /**
   * Validate required entities for event tracking
   */
  private validateTrackingEntities(bizUser: BizUser, bizSession: BizSession, event: Event) {
    return bizUser && bizSession && bizSession.state !== 1 && event;
  }

  /**
   * Handle question answer creation or update for question answered events
   */
  private async handleQuestionAnswer(
    tx: Prisma.TransactionClient,
    bizEvent: BizEvent,
    events: Record<string, unknown>,
    contentId: string,
    versionId: string,
    bizUserId: string,
    bizSessionId: string,
    environmentId: string,
  ) {
    const cvid = events[EventAttributes.QUESTION_CVID] as string;

    // First, try to find existing answer by cvid and bizSessionId
    const existingAnswer = await tx.bizAnswer.findFirst({
      where: {
        cvid,
        bizSessionId,
      },
    });

    const answerData: any = {
      bizEventId: bizEvent.id,
      contentId,
      cvid,
      versionId,
      bizUserId,
      bizSessionId,
      environmentId,
    };

    // Map answer fields based on the original implementation
    if (events[EventAttributes.NUMBER_ANSWER]) {
      answerData.numberAnswer = events[EventAttributes.NUMBER_ANSWER] as number;
    }
    if (events[EventAttributes.TEXT_ANSWER]) {
      answerData.textAnswer = events[EventAttributes.TEXT_ANSWER] as string;
    }
    if (events[EventAttributes.LIST_ANSWER]) {
      answerData.listAnswer = events[EventAttributes.LIST_ANSWER] as string[];
    }

    if (existingAnswer) {
      // Update existing answer
      await tx.bizAnswer.update({
        where: { id: existingAnswer.id },
        data: answerData,
      });
    } else {
      // Create new answer
      await tx.bizAnswer.create({ data: answerData });
    }
  }

  /**
   * Execute event tracking transaction
   */
  private async executeEventTransaction(
    tx: Prisma.TransactionClient,
    environment: Environment,
    externalUserId: string,
    eventName: string,
    sessionId: string,
    data: Record<string, any>,
    clientContext: ClientContext,
  ) {
    const { id: environmentId, projectId } = environment;

    const eventData = this.enrichEventData(data, clientContext);

    // Fetch required entities
    const [bizUser, bizSession, event] = await Promise.all([
      tx.bizUser.findFirst({
        where: { externalId: externalUserId, environmentId },
      }),
      tx.bizSession.findUnique({
        where: { id: sessionId },
        include: {
          content: { include: { contentOnEnvironments: true } },
          bizEvent: { include: { event: true } },
          version: true,
        },
      }),
      tx.event.findFirst({
        where: { codeName: eventName, projectId },
      }),
    ]);

    // Validate entities
    if (!this.validateTrackingEntities(bizUser, bizSession, event)) {
      return false;
    }

    // Filter event data
    const events = await this.filterEventDataByAttributes(event.id, eventData);
    if (!events) {
      return false;
    }

    // Calculate progress and state
    const progress =
      events?.flow_step_progress !== undefined
        ? getEventProgress(eventName, events.flow_step_progress)
        : undefined;
    const state = getEventState(eventName);
    // Re-fetch session with latest events
    const latestBizSession = await tx.bizSession.findUnique({
      where: { id: sessionId },
      include: { bizEvent: { include: { event: true } } },
    });

    if (!latestBizSession || latestBizSession.state === 1) {
      return false;
    }

    // Validate event
    if (!isValidEvent(eventName, latestBizSession, events)) {
      return false;
    }

    // Update seen attributes
    await this.updateSeenAttributes(tx, bizUser, bizSession);

    // Create business event
    const bizEvent = await tx.bizEvent.create({
      data: {
        bizUserId: bizUser.id,
        eventId: event.id,
        data: events,
        bizSessionId: bizSession.id,
      },
    });

    // Update session
    await tx.bizSession.update({
      where: { id: bizSession.id },
      data: {
        ...(progress !== undefined && { progress: Math.max(progress, bizSession.progress) }),
        state,
      },
    });

    // Handle question answered event
    if (eventName === BizEvents.QUESTION_ANSWERED) {
      await this.handleQuestionAnswer(
        tx,
        bizEvent,
        events,
        bizSession.contentId,
        bizSession.versionId,
        bizUser.id,
        bizSession.id,
        environmentId,
      );
    }

    return bizEvent;
  }

  /**
   * Track an event
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param eventName - The event name
   * @param sessionId - The session ID
   * @param data - The event data
   * @returns The tracked event
   */
  async trackEvent(
    environment: Environment,
    externalUserId: string,
    eventName: string,
    sessionId: string,
    data: Record<string, any>,
    clientContext: ClientContext,
  ): Promise<BizEvent | false> {
    return this.prisma.$transaction(async (tx) => {
      return await this.executeEventTransaction(
        tx,
        environment,
        externalUserId,
        eventName,
        sessionId,
        data,
        clientContext,
      );
    });
  }

  /**
   * Build event data for flow start events
   * @param customContentVersion - The custom content version
   * @param startReason - The start reason
   * @returns Flow start event data
   */
  private buildFlowStartEventData(
    customContentVersion: CustomContentVersion,
    startReason: string,
  ): Record<string, any> {
    return {
      [EventAttributes.FLOW_START_REASON]: startReason,
      [EventAttributes.FLOW_VERSION_ID]: customContentVersion.id,
      [EventAttributes.FLOW_VERSION_NUMBER]: customContentVersion.sequence,
    };
  }

  /**
   * Build event data for checklist start events
   * @param customContentVersion - The custom content version
   * @param startReason - The start reason
   * @returns Checklist start event data
   */
  private buildChecklistStartEventData(
    customContentVersion: CustomContentVersion,
    startReason: string,
  ): Record<string, any> {
    return {
      [EventAttributes.CHECKLIST_ID]: customContentVersion.content.id,
      [EventAttributes.CHECKLIST_NAME]: customContentVersion.content.name,
      [EventAttributes.CHECKLIST_START_REASON]: startReason,
      [EventAttributes.CHECKLIST_VERSION_ID]: customContentVersion.id,
      [EventAttributes.CHECKLIST_VERSION_NUMBER]: customContentVersion.sequence,
    };
  }

  /**
   * Get event name and data for auto start events
   * @param customContentVersion - The custom content version
   * @param startReason - The start reason
   * @returns Object containing event name and event data
   */
  private getAutoStartEventConfig(
    customContentVersion: CustomContentVersion,
    startReason: string,
  ): { eventName: string; eventData: Record<string, any> } {
    const contentType = customContentVersion.content.type as ContentDataType;

    if (contentType === ContentDataType.FLOW) {
      return {
        eventName: BizEvents.FLOW_STARTED,
        eventData: this.buildFlowStartEventData(customContentVersion, startReason),
      };
    }

    return {
      eventName: BizEvents.CHECKLIST_STARTED,
      eventData: this.buildChecklistStartEventData(customContentVersion, startReason),
    };
  }

  /**
   * Execute auto start event
   * @param tx - The transaction client
   * @param customContentVersion - The custom content version
   * @param bizSession - The business session
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param startReason - The start reason
   * @param clientContext - The client context
   * @returns True if the event was tracked successfully
   */
  private async executeAutoStartEvent(
    tx: Prisma.TransactionClient,
    customContentVersion: CustomContentVersion,
    bizSession: BizSession,
    environment: Environment,
    externalUserId: string,
    startReason: string,
    clientContext: ClientContext,
  ): Promise<void> {
    const autoStartEventConfig = this.getAutoStartEventConfig(customContentVersion, startReason);
    // Execute both events in a single transaction
    await this.executeEventTransaction(
      tx,
      environment,
      externalUserId,
      autoStartEventConfig.eventName,
      bizSession.id,
      autoStartEventConfig.eventData,
      clientContext,
    );
  }

  /**
   * Build go to step event data
   * @param bizSession - The business session
   * @param stepId - The step ID
   * @returns Object containing event data and completion status, or null if validation fails
   */
  private async buildGoToStepEventData(
    version: VersionWithSteps,
    stepId: string,
  ): Promise<{
    eventData: Record<string, any>;
    isComplete: boolean;
  } | null> {
    const stepIndex = version.steps.findIndex((step: Step) => step.id === stepId);

    if (stepIndex === -1) {
      return null;
    }

    const step = version.steps[stepIndex];
    const total = version.steps.length;
    const progress = Math.round(((stepIndex + 1) / total) * 100);
    const isExplicitCompletionStep = (step.setting as StepSettings).explicitCompletionStep;
    const isComplete = isExplicitCompletionStep
      ? isExplicitCompletionStep
      : stepIndex + 1 === total;

    // Build event data
    const eventData = {
      [EventAttributes.FLOW_VERSION_ID]: version.id,
      [EventAttributes.FLOW_VERSION_NUMBER]: version.sequence,
      [EventAttributes.FLOW_STEP_NUMBER]: stepIndex,
      [EventAttributes.FLOW_STEP_CVID]: step.cvid,
      [EventAttributes.FLOW_STEP_NAME]: step.name,
      [EventAttributes.FLOW_STEP_PROGRESS]: Math.round(progress),
    };

    return { eventData, isComplete };
  }

  /**
   * Execute go to step event
   * @param tx - The transaction client
   * @param sessionId - The session ID
   * @param stepId - The step ID
   * @param environment - The environment
   * @param clientContext - The client context
   * @returns Void
   */
  private async excuteGoToStepEvent(
    tx: Prisma.TransactionClient,
    sessionId: string,
    stepId: string,
    environment: Environment,
    clientContext: ClientContext,
  ): Promise<void> {
    // Find the business session with related data
    const bizSession = await tx.bizSession.findUnique({
      where: { id: sessionId },
      include: { bizUser: true, version: { include: { steps: true } } },
    });

    if (!bizSession) {
      return;
    }
    // Build go to step event data
    const eventDataResult = await this.buildGoToStepEventData(bizSession.version, stepId);
    if (!eventDataResult) {
      return;
    }

    const { eventData, isComplete } = eventDataResult;
    const externalUserId = String(bizSession.bizUser.externalId);

    // Track the FLOW_STEP_SEEN event
    await this.executeEventTransaction(
      tx,
      environment,
      externalUserId,
      BizEvents.FLOW_STEP_SEEN,
      bizSession.id,
      eventData,
      clientContext,
    );

    // Track the FLOW_COMPLETED event if the step is complete
    if (isComplete) {
      await this.executeEventTransaction(
        tx,
        environment,
        externalUserId,
        BizEvents.FLOW_COMPLETED,
        bizSession.id,
        eventData,
        clientContext,
      );
    }
  }

  /**
   * Track auto start event for flows or checklists
   * @param customContentVersion - The custom content version
   * @param bizSession - The business session
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param startReason - The start reason
   * @param clientContext - The socket context
   * @returns The tracked event or false if tracking failed
   */
  async trackAutoStartEvent(
    customContentVersion: CustomContentVersion,
    bizSession: BizSession,
    environment: Environment,
    externalUserId: string,
    startReason: string,
    stepId: string | null,
    clientContext: ClientContext,
  ): Promise<boolean> {
    // Input validation
    if (!customContentVersion?.content?.type || !startReason?.trim() || !externalUserId?.trim()) {
      return false;
    }

    // Execute both events in a single transaction
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.executeAutoStartEvent(
          tx,
          customContentVersion,
          bizSession,
          environment,
          externalUserId,
          startReason,
          clientContext,
        );
        if (stepId) {
          await this.excuteGoToStepEvent(tx, bizSession.id, stepId, environment, clientContext);
        }

        return true;
      });
    } catch (error) {
      // Log error for debugging
      this.logger.error('Failed to track auto start events', error.message);
      return false;
    }
  }

  /**
   * Track go to step event
   * @param sessionId - The session ID
   * @param stepId - The step ID
   * @param environment - The environment
   * @param clientContext - The client context
   * @returns True if the event was tracked successfully
   */
  async trackGoToStepEvent(
    sessionId: string,
    stepId: string,
    environment: Environment,
    clientContext: ClientContext,
  ): Promise<boolean> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Track the FLOW_STEP_SEEN event
        await this.excuteGoToStepEvent(tx, sessionId, stepId, environment, clientContext);
        return true;
      });
    } catch (error) {
      // Log error for debugging
      this.logger.error('Failed to track go to step events', error.message);
      return false;
    }
  }

  /**
   * Track flow ended event
   * @param bizSession - The business session
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param endReason - The end reason
   * @returns The tracked event or false if tracking failed
   */
  async trackFlowEndedEvent(
    bizSession: BizSession,
    environment: Environment,
    externalUserId: string,
    endReason: string,
    clientContext: ClientContext,
  ): Promise<BizEvent | false> {
    const latestStepSeenEvent = await this.prisma.bizEvent.findFirst({
      where: {
        bizSessionId: bizSession.id,
        event: {
          codeName: BizEvents.FLOW_STEP_SEEN,
        },
      },
      include: { event: true },
      orderBy: { createdAt: 'desc' },
    });
    const seenData = (latestStepSeenEvent?.data as any) ?? {};

    const eventData: Record<string, any> = deepmerge({}, seenData, {
      [EventAttributes.FLOW_END_REASON]: endReason,
    });
    const eventName = BizEvents.FLOW_ENDED;

    return await this.trackEvent(
      environment,
      externalUserId,
      eventName,
      bizSession.id,
      eventData,
      clientContext,
    );
  }

  /**
   * Track checklist dismissed event
   * @param sessionId - The session ID
   * @param environment - The environment
   * @param clientContext - The client context
   * @param endReason - The end reason
   * @returns True if the event was tracked successfully
   */
  async trackChecklistDismissedEvent(
    sessionId: string,
    environment: Environment,
    clientContext: ClientContext,
    endReason: string,
  ): Promise<boolean> {
    if (!environment) return false;
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { bizUser: true, content: true, version: { include: { steps: true } } },
    });
    if (!bizSession) return false;
    const content = bizSession.content;
    const version = bizSession.version;

    const eventData = {
      [EventAttributes.CHECKLIST_ID]: content.id,
      [EventAttributes.CHECKLIST_VERSION_NUMBER]: version.sequence,
      [EventAttributes.CHECKLIST_VERSION_ID]: version.id,
      [EventAttributes.CHECKLIST_NAME]: content.name,
      [EventAttributes.CHECKLIST_END_REASON]: endReason,
    };

    const externalUserId = String(bizSession.bizUser.externalId);
    return Boolean(
      await this.trackEvent(
        environment,
        externalUserId,
        BizEvents.CHECKLIST_DISMISSED,
        bizSession.id,
        eventData,
        clientContext,
      ),
    );
  }
}
