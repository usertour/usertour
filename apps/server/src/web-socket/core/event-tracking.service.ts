import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Tx } from '@/common/types/schema';
import { getEventProgress, getEventState, isValidEvent } from '@/utils/event-v2';
import {
  BizEvents,
  CompanyAttributes,
  ContentDataType,
  EventAttributes,
  UserAttributes,
  ClientContext,
  StepSettings,
  ChecklistData,
} from '@usertour/types';
import {
  BizCompany,
  BizSession,
  BizUser,
  Environment,
  VersionWithSteps,
  Step,
  BizSessionWithEvents,
} from '@/common/types/schema';
import { CustomContentVersion } from '@/common/types/content';
import { deepmerge } from 'deepmerge-ts';
import { isUndefined } from '@usertour/helpers';

/**
 * Parameters for tracking question answered events
 */
type QuestionAnsweredParams = {
  sessionId: string;
  questionCvid: string;
  questionName: string;
  questionType: string;
  listAnswer?: string[];
  numberAnswer?: number;
  textAnswer?: string;
};

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
   * Update seen timestamps for a data record
   * @param data - Current data record
   * @param firstSeenKey - Key for first seen timestamp
   * @param lastSeenKey - Key for last seen timestamp
   * @param currentTime - Current timestamp
   * @returns Updated data with seen timestamps
   */
  private updateSeenTimestamps(
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
  private updateUserSeenAttributes(tx: Tx, user: BizUser, currentTime: string): Promise<BizUser> {
    const userData = (user.data as Record<string, unknown>) || {};
    const updatedUserData = this.updateSeenTimestamps(
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
    tx: Tx,
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
    const updatedCompanyData = this.updateSeenTimestamps(
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
  private async updateSeenAttributes(tx: Tx, user: BizUser, bizCompanyId?: string): Promise<void> {
    const currentTime = new Date().toISOString();

    // Prepare update operations
    const updateOperations: Promise<BizUser | BizCompany | null>[] = [
      this.updateUserSeenAttributes(tx, user, currentTime),
    ];

    // Add company update operation if company exists
    if (bizCompanyId) {
      updateOperations.push(this.updateCompanySeenAttributes(tx, bizCompanyId, currentTime));
    }

    // Execute all updates in parallel within the transaction
    await Promise.all(updateOperations);
  }

  /**
   * Add client context to event data
   */
  private addClientContextToEventData(data: Record<string, unknown>, clientContext: ClientContext) {
    if (clientContext) {
      return {
        ...data,
        [EventAttributes.PAGE_URL]: clientContext.pageUrl,
        [EventAttributes.VIEWPORT_WIDTH]: clientContext.viewportWidth,
        [EventAttributes.VIEWPORT_HEIGHT]: clientContext.viewportHeight,
      };
    }
    return data;
  }

  /**
   * Handle question answer creation or update for question answered events
   */
  private async handleQuestionAnswer(
    tx: Tx,
    bizEventId: string,
    bizSession: BizSessionWithEvents,
    events: Record<string, unknown>,
  ) {
    const cvid = events[EventAttributes.QUESTION_CVID] as string;
    const bizUserId = bizSession.bizUserId;
    const environmentId = bizSession.environmentId;
    const contentId = bizSession.contentId;
    const versionId = bizSession.versionId;
    const bizSessionId = bizSession.id;

    // First, try to find existing answer by cvid and bizSessionId
    const existingAnswer = await tx.bizAnswer.findFirst({
      where: {
        cvid,
        bizSessionId,
      },
    });

    const answerData: Record<string, any> = {
      bizEventId: bizEventId,
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
      await tx.bizAnswer.create({ data: answerData as any });
    }
  }

  /**
   * Process event creation
   * @param tx - Database transaction client
   * @param sessionId - Session ID
   * @param eventName - Event name
   * @param events - Event data
   * @param eventId - Event ID
   * @returns True if the event was created successfully
   */
  private async handleEventCreation(
    tx: Tx,
    sessionId: string,
    eventId: string,
    eventCodeName: string,
    events: Record<string, any>,
  ): Promise<boolean> {
    // Re-fetch session with latest events
    const bizSession = await tx.bizSession.findUnique({
      where: { id: sessionId },
      include: { bizEvent: { include: { event: true } } },
    });

    if (!bizSession || bizSession.state === 1) {
      return false;
    }

    // Validate event
    if (!isValidEvent(eventCodeName, bizSession, events)) {
      return false;
    }
    const bizUserId = bizSession.bizUserId;
    // Create business event
    const bizEvent = await tx.bizEvent.create({
      data: {
        bizUserId,
        eventId,
        data: events,
        bizSessionId: sessionId,
      },
    });

    // Handle question answered event
    if (eventCodeName === BizEvents.QUESTION_ANSWERED) {
      await this.handleQuestionAnswer(tx, bizEvent.id, bizSession, events);
    }
    return true;
  }

  /**
   * Execute event tracking transaction
   */
  private async executeEventTransaction(
    tx: Tx,
    environment: Environment,
    externalUserId: string,
    eventCodeName: string,
    sessionId: string,
    data: Record<string, any>,
    clientContext: ClientContext,
  ) {
    const { id: environmentId, projectId } = environment;

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
        where: { codeName: eventCodeName, projectId },
      }),
    ]);

    // Validate entities
    if (!bizUser || !bizSession || bizSession.state === 1 || !event) {
      return false;
    }

    const eventData = this.addClientContextToEventData(data, clientContext);
    // Filter event data
    const events = await this.filterEventDataByAttributes(event.id, eventData);
    if (!events) {
      return false;
    }

    // Create and validate business event
    const isEventCreated = await this.handleEventCreation(
      tx,
      sessionId,
      event.id,
      eventCodeName,
      events,
    );

    if (!isEventCreated) {
      return false;
    }

    // Update seen attributes
    await this.updateSeenAttributes(tx, bizUser, bizSession.bizCompanyId);

    // Update session progress and state
    await this.updateSessionProgressAndState(tx, bizSession, eventCodeName, events);

    return true;
  }

  /**
   * Update session progress and state based on event data
   * @param tx - Prisma transaction
   * @param bizSession - Business session to update
   * @param eventCodeName - Event code name
   * @param events - Event data containing flow_step_progress
   * @returns Promise<void>
   */
  private async updateSessionProgressAndState(
    tx: Tx,
    bizSession: { id: string; progress: number; state: number },
    eventCodeName: string,
    events?: { flow_step_progress?: number },
  ): Promise<void> {
    // Calculate progress and state
    const newProgress =
      events?.flow_step_progress !== undefined
        ? getEventProgress(eventCodeName, events.flow_step_progress)
        : null;
    const newState = getEventState(eventCodeName);

    // Prepare update data only if there are changes
    const updateData: Partial<{ progress: number; state: number }> = {};

    if (newProgress !== null) {
      const maxProgress = Math.max(newProgress, bizSession.progress);
      if (maxProgress !== bizSession.progress) {
        updateData.progress = maxProgress;
      }
    }

    if (newState !== bizSession.state) {
      updateData.state = newState;
    }

    // Update session only if there are changes
    if (Object.keys(updateData).length > 0) {
      await tx.bizSession.update({
        where: { id: bizSession.id },
        data: updateData,
      });
    }
  }

  /**
   * Track an event
   * @param environment - The environment
   * @param externalUserId - The external user ID
   * @param eventName - The event name
   * @param sessionId - The session ID
   * @param data - The event data
   * @returns True if the event was tracked successfully
   */
  async trackEvent(
    environment: Environment,
    externalUserId: string,
    eventName: string,
    sessionId: string,
    data: Record<string, any>,
    clientContext: ClientContext,
  ): Promise<boolean> {
    return await this.prisma.$transaction(async (tx) => {
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
   * Build event data for launcher seen events
   * @param customContentVersion - The custom content version
   * @param startReason - The start reason
   * @returns Launcher seen event data
   */
  private buildLauncherSeenEventData(
    customContentVersion: CustomContentVersion,
    startReason: string,
  ): Record<string, any> {
    return {
      [EventAttributes.LAUNCHER_ID]: customContentVersion.content.id,
      [EventAttributes.LAUNCHER_NAME]: customContentVersion.content.name,
      [EventAttributes.LAUNCHER_START_REASON]: startReason,
      [EventAttributes.LAUNCHER_VERSION_ID]: customContentVersion.id,
      [EventAttributes.LAUNCHER_VERSION_NUMBER]: customContentVersion.sequence,
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
  ): { eventName: string; eventData: Record<string, any> } | null {
    const contentType = customContentVersion.content.type as ContentDataType;

    if (contentType === ContentDataType.FLOW) {
      return {
        eventName: BizEvents.FLOW_STARTED,
        eventData: this.buildFlowStartEventData(customContentVersion, startReason),
      };
    }

    if (contentType === ContentDataType.CHECKLIST) {
      return {
        eventName: BizEvents.CHECKLIST_STARTED,
        eventData: this.buildChecklistStartEventData(customContentVersion, startReason),
      };
    }

    if (contentType === ContentDataType.LAUNCHER) {
      return {
        eventName: BizEvents.LAUNCHER_SEEN,
        eventData: this.buildLauncherSeenEventData(customContentVersion, startReason),
      };
    }

    return null;
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
    tx: Tx,
    customContentVersion: CustomContentVersion,
    bizSession: BizSession,
    environment: Environment,
    externalUserId: string,
    startReason: string,
    clientContext: ClientContext,
  ): Promise<void> {
    const autoStartEventConfig = this.getAutoStartEventConfig(customContentVersion, startReason);
    if (!autoStartEventConfig) {
      return;
    }
    const { eventName, eventData } = autoStartEventConfig;
    // Execute both events in a single transaction
    await this.executeEventTransaction(
      tx,
      environment,
      externalUserId,
      eventName,
      bizSession.id,
      eventData,
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
  private async executeGoToStepEvent(
    tx: Tx,
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
          await this.executeGoToStepEvent(tx, bizSession.id, stepId, environment, clientContext);
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
        await this.executeGoToStepEvent(tx, sessionId, stepId, environment, clientContext);
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
  ): Promise<boolean> {
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
    return await this.trackEvent(
      environment,
      externalUserId,
      BizEvents.CHECKLIST_DISMISSED,
      bizSession.id,
      eventData,
      clientContext,
    );
  }

  /**
   * Track question answered event
   * @param params - The parameters for the question answered event
   * @param environment - The environment
   * @param clientContext - The client context
   * @returns True if the event was tracked successfully
   */
  async trackQuestionAnsweredEvent(
    params: QuestionAnsweredParams,
    environment: Environment,
    clientContext: ClientContext,
  ): Promise<boolean> {
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: params.sessionId },
      include: { bizUser: true },
    });
    if (!bizSession) return false;

    const eventData: any = {
      [EventAttributes.QUESTION_CVID]: params.questionCvid,
      [EventAttributes.QUESTION_NAME]: params.questionName,
      [EventAttributes.QUESTION_TYPE]: params.questionType,
    };

    if (!isUndefined(params.listAnswer)) {
      eventData[EventAttributes.LIST_ANSWER] = params.listAnswer;
    }
    if (!isUndefined(params.numberAnswer)) {
      eventData[EventAttributes.NUMBER_ANSWER] = params.numberAnswer;
    }
    if (!isUndefined(params.textAnswer)) {
      eventData[EventAttributes.TEXT_ANSWER] = params.textAnswer;
    }
    const externalUserId = String(bizSession.bizUser.externalId);

    return await this.trackEvent(
      environment,
      externalUserId,
      BizEvents.QUESTION_ANSWERED,
      bizSession.id,
      eventData,
      clientContext,
    );
  }

  /**
   * Track checklist task clicked event
   * @param sessionId - The session ID
   * @param environment - The environment
   * @param clientContext - The client context
   * @param taskId - The task ID
   * @returns True if the event was tracked successfully
   */
  async trackChecklistTaskClickedEvent(
    sessionId: string,
    environment: Environment,
    clientContext: ClientContext,
    taskId: string,
  ): Promise<boolean> {
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { bizUser: true, content: true, version: { include: { steps: true } } },
    });
    if (!bizSession) return false;
    const content = bizSession.content;
    const version = bizSession.version;
    const checklistData = version.data as unknown as ChecklistData;
    const checklistItem = checklistData.items.find((item) => item.id === taskId);
    if (!checklistItem) return false;

    const eventData = {
      [EventAttributes.CHECKLIST_ID]: content.id,
      [EventAttributes.CHECKLIST_VERSION_NUMBER]: version.sequence,
      [EventAttributes.CHECKLIST_VERSION_ID]: version.id,
      [EventAttributes.CHECKLIST_NAME]: content.name,
      [EventAttributes.CHECKLIST_TASK_ID]: checklistItem.id,
      [EventAttributes.CHECKLIST_TASK_NAME]: checklistItem.name,
    };
    const externalUserId = String(bizSession.bizUser.externalId);

    return await this.trackEvent(
      environment,
      externalUserId,
      BizEvents.CHECKLIST_TASK_CLICKED,
      bizSession.id,
      eventData,
      clientContext,
    );
  }

  /**
   * Track checklist hidden event
   * @param sessionId - The session ID
   * @param environment - The environment
   * @param clientContext - The client context
   * @returns True if the event was tracked successfully
   */
  async trackChecklistHiddenEvent(
    sessionId: string,
    environment: Environment,
    clientContext: ClientContext,
  ): Promise<boolean> {
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
    };

    const externalUserId = String(bizSession.bizUser.externalId);
    return await this.trackEvent(
      environment,
      externalUserId,
      BizEvents.CHECKLIST_HIDDEN,
      bizSession.id,
      eventData,
      clientContext,
    );
  }

  /**
   * Track checklist seen event
   * @param sessionId - The session ID
   * @param environment - The environment
   * @param clientContext - The client context
   * @returns True if the event was tracked successfully
   */
  async trackChecklistSeenEvent(
    sessionId: string,
    environment: Environment,
    clientContext: ClientContext,
  ): Promise<boolean> {
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
    };

    const externalUserId = String(bizSession.bizUser.externalId);
    return await this.trackEvent(
      environment,
      externalUserId,
      BizEvents.CHECKLIST_SEEN,
      bizSession.id,
      eventData,
      clientContext,
    );
  }

  /**
   * Track tooltip target missing event
   * @param sessionId - The session ID
   * @param stepId - The step ID
   * @param environment - The environment
   * @param clientContext - The client context
   * @returns True if the event was tracked successfully
   */
  async trackTooltipTargetMissingEvent(
    sessionId: string,
    stepId: string,
    environment: Environment,
    clientContext: ClientContext,
  ): Promise<boolean> {
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { bizUser: true, version: { include: { steps: true } } },
    });
    if (!bizSession) return false;
    const version = bizSession.version;
    const step = version.steps.find((s) => s.id === stepId);
    if (!step) return false;
    const stepIndex = version.steps.findIndex((s) => s.id === step.id);
    if (stepIndex === -1) return false;

    const total = version.steps.length;
    const progress = Math.round(((stepIndex + 1) / total) * 100);

    const eventData = {
      [EventAttributes.FLOW_VERSION_ID]: version.id,
      [EventAttributes.FLOW_VERSION_NUMBER]: version.sequence,
      [EventAttributes.FLOW_STEP_NUMBER]: stepIndex,
      [EventAttributes.FLOW_STEP_CVID]: step.cvid,
      [EventAttributes.FLOW_STEP_NAME]: step.name,
      [EventAttributes.FLOW_STEP_PROGRESS]: progress,
    };

    const externalUserId = String(bizSession.bizUser.externalId);
    return await this.trackEvent(
      environment,
      externalUserId,
      BizEvents.TOOLTIP_TARGET_MISSING,
      bizSession.id,
      eventData,
      clientContext,
    );
  }

  /**
   * Track launcher activated event
   * @param sessionId - The session ID
   * @param environment - The environment
   * @param clientContext - The client context
   * @returns True if the event was tracked successfully
   */
  async trackLauncherActivatedEvent(
    sessionId: string,
    environment: Environment,
    clientContext: ClientContext,
  ): Promise<boolean> {
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { bizUser: true, content: true, version: true },
    });
    if (!bizSession) return false;
    const content = bizSession.content;
    const version = bizSession.version;

    const eventData = {
      [EventAttributes.LAUNCHER_ID]: content.id,
      [EventAttributes.LAUNCHER_NAME]: content.name,
      [EventAttributes.LAUNCHER_VERSION_ID]: version.id,
      [EventAttributes.LAUNCHER_VERSION_NUMBER]: version.sequence,
    };

    const externalUserId = String(bizSession.bizUser.externalId);
    return await this.trackEvent(
      environment,
      externalUserId,
      BizEvents.LAUNCHER_ACTIVATED,
      bizSession.id,
      eventData,
      clientContext,
    );
  }

  /**
   * Track launcher dismissed event
   * @param sessionId - The session ID
   * @param environment - The environment
   * @param clientContext - The client context
   * @param endReason - The end reason
   * @returns True if the event was tracked successfully
   */
  async trackLauncherDismissedEvent(
    sessionId: string,
    environment: Environment,
    clientContext: ClientContext,
    endReason: string,
  ): Promise<boolean> {
    if (!environment) return false;
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { bizUser: true, content: true, version: true },
    });
    if (!bizSession) return false;
    const content = bizSession.content;
    const version = bizSession.version;

    const eventData = {
      [EventAttributes.LAUNCHER_ID]: content.id,
      [EventAttributes.LAUNCHER_NAME]: content.name,
      [EventAttributes.LAUNCHER_VERSION_ID]: version.id,
      [EventAttributes.LAUNCHER_VERSION_NUMBER]: version.sequence,
      [EventAttributes.LAUNCHER_END_REASON]: endReason,
    };

    const externalUserId = String(bizSession.bizUser.externalId);
    return await this.trackEvent(
      environment,
      externalUserId,
      BizEvents.LAUNCHER_DISMISSED,
      bizSession.id,
      eventData,
      clientContext,
    );
  }
}
