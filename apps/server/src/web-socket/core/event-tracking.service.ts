import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  getCurrentStepId,
  getEventState,
  isValidEvent,
  calculateSessionProgress,
  buildFlowStartEventData,
  buildChecklistStartEventData,
  buildLauncherSeenEventData,
  buildLauncherBaseEventData,
  buildLauncherDismissedEventData,
  buildStepEventData,
  buildChecklistDismissedEventData,
  buildChecklistBaseEventData,
  buildChecklistTaskEventData,
  buildFlowEndedEventData,
  buildQuestionAnsweredEventData,
  getAnswer,
  assignClientContext,
} from '@/utils/event-v2';
import {
  BizEvents,
  CompanyAttributes,
  ContentDataType,
  EventAttributes,
  UserAttributes,
  ClientContext,
} from '@usertour/types';
import {
  BizCompany,
  BizSession,
  BizUser,
  Environment,
  Step,
  BizSessionWithEvents,
  BizSessionWithRelations,
  Tx,
} from '@/common/types/schema';
import { CustomContentVersion } from '@/common/types/content';
import { isNullish } from '@usertour/helpers';
import { extractStepBindToAttribute } from '@/utils/content-question';
import { BizService } from '@/biz/biz.service';
import type { AnswerQuestionDto } from '@usertour/types';

// ============================================================================
// Event Handler Types
// ============================================================================

/**
 * Base parameters for event tracking
 */
interface BaseEventTrackingParams {
  sessionId: string;
  environment: Environment;
  clientContext: ClientContext;
}

/**
 * Extended parameters for events that require additional data
 */
interface EventTrackingParams extends BaseEventTrackingParams {
  endReason?: string;
  stepId?: string;
  taskId?: string;
}

/**
 * Event handler configuration
 */
interface EventHandlerConfig {
  eventName: BizEvents;
  buildEventData: (
    session: BizSessionWithRelations,
    params: EventTrackingParams,
  ) => Record<string, any> | null;
}

/**
 * Event handler interface
 */
interface EventHandler {
  handle(params: EventTrackingParams): Promise<boolean>;
}

@Injectable()
export class EventTrackingService {
  private readonly logger = new Logger(EventTrackingService.name);
  private eventHandlers = new Map<BizEvents, EventHandler>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly bizService: BizService,
  ) {
    this.registerEventHandlers();
  }

  // ============================================================================
  // Database Query Methods
  // ============================================================================

  /**
   * Find business session with user and events
   * @param client - Prisma client or transaction client
   * @param sessionId - Session ID
   * @returns Business session with user and events, or null if not found
   */
  async findBizSessionWithEvents(sessionId: string): Promise<BizSessionWithEvents | null> {
    return await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { bizUser: true, version: true, bizEvent: { include: { event: true } } },
    });
  }

  /**
   * Find business session with user, content and version
   * @param sessionId - Session ID
   * @param client - Optional Prisma client or transaction client (defaults to this.prisma)
   * @returns Business session with user, content and version, or null if not found
   */
  private async findBizSessionWithRelations(
    sessionId: string,
    client?: PrismaService | Tx,
  ): Promise<BizSessionWithRelations | null> {
    const prismaClient = client ?? this.prisma;
    return await prismaClient.bizSession.findUnique({
      where: { id: sessionId },
      include: {
        bizUser: true,
        content: true,
        version: { include: { steps: { orderBy: { sequence: 'asc' } } } },
      },
    });
  }

  /**
   * Get business session for event tracking
   * @param sessionId - Session ID
   * @param client - Optional Prisma client or transaction client (defaults to this.prisma)
   * @returns Business session with relations, or null if invalid
   */
  private async getTrackingSession(
    sessionId: string,
    client?: PrismaService | Tx,
  ): Promise<BizSessionWithRelations | null> {
    const bizSession = await this.findBizSessionWithRelations(sessionId, client);

    // Standard validation: session must exist and have content and version
    if (!bizSession || !bizSession.content || !bizSession.version) {
      return null;
    }

    return bizSession;
  }

  // ============================================================================
  // Event Data Processing Methods
  // ============================================================================

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

  // ============================================================================
  // User and Company Attribute Update Methods
  // ============================================================================

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
   * @param bizCompanyId - Business company ID
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

  // ============================================================================
  // Event Creation and Processing Methods
  // ============================================================================

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

    // Extract answer fields (only these fields should be updated for existing answers)
    // Use isNullish to handle falsy values like 0, empty string, or empty array
    const answerFields: Record<string, any> = {};
    if (!isNullish(events[EventAttributes.NUMBER_ANSWER])) {
      answerFields.numberAnswer = events[EventAttributes.NUMBER_ANSWER] as number;
    }
    if (!isNullish(events[EventAttributes.TEXT_ANSWER])) {
      answerFields.textAnswer = events[EventAttributes.TEXT_ANSWER] as string;
    }
    if (!isNullish(events[EventAttributes.LIST_ANSWER])) {
      answerFields.listAnswer = events[EventAttributes.LIST_ANSWER] as string[];
    }

    if (existingAnswer) {
      // Update answer fields and bizEventId (bizEventId may change for new events)
      await tx.bizAnswer.update({
        where: { id: existingAnswer.id },
        data: {
          versionId,
          bizEventId,
          ...answerFields,
        },
      });
    } else {
      // Create new answer with all required fields
      await tx.bizAnswer.create({
        data: {
          bizEventId,
          contentId,
          cvid,
          versionId,
          bizUserId,
          bizSessionId,
          environmentId,
          ...answerFields,
        },
      });
    }
  }

  /**
   * Process event creation
   * @param tx - Database transaction client
   * @param bizSession - Business session with events (already fetched)
   * @param eventId - Event ID
   * @param eventCodeName - Event code name
   * @param events - Event data
   * @returns True if the event was created successfully
   */
  private async handleEventCreation(
    tx: Tx,
    bizSession: BizSessionWithEvents,
    eventId: string,
    eventCodeName: string,
    events: Record<string, any>,
  ): Promise<boolean> {
    // Validate event using the provided session
    if (!isValidEvent(eventCodeName, bizSession, events)) {
      return false;
    }

    // Create business event
    const bizEvent = await tx.bizEvent.create({
      data: {
        bizUserId: bizSession.bizUserId,
        eventId,
        data: events,
        bizSessionId: bizSession.id,
      },
    });

    // Handle question answered event
    if (eventCodeName === BizEvents.QUESTION_ANSWERED) {
      await this.handleQuestionAnswer(tx, bizEvent.id, bizSession, events);
    }
    return true;
  }

  // ============================================================================
  // Session Update Methods
  // ============================================================================

  /**
   * Update session progress and state based on event data
   * @param tx - Prisma transaction
   * @param bizSession - Business session to update
   * @param eventCodeName - Event code name
   * @param events - Event data containing flow_step_progress
   * @returns Promise<void>
   */
  private async updateBizSession(
    tx: Tx,
    bizSession: BizSession,
    eventCodeName: string,
    events: Record<string, unknown>,
  ): Promise<void> {
    // Calculate progress and state
    const newProgress = calculateSessionProgress(events, eventCodeName, bizSession.progress);
    const newState = getEventState(eventCodeName, bizSession.state);
    const newCurrentStepId = getCurrentStepId(events, eventCodeName, bizSession.currentStepId);

    // Prepare update data only if there are changes
    const updateData: Partial<{ progress: number; state: number; currentStepId: string }> = {};

    if (newProgress !== null) {
      updateData.progress = newProgress;
    }

    if (newState !== null) {
      updateData.state = newState;
    }

    if (newCurrentStepId !== null) {
      updateData.currentStepId = newCurrentStepId;
    }

    // Update session only if there are changes
    if (Object.keys(updateData).length > 0) {
      await tx.bizSession.update({
        where: { id: bizSession.id },
        data: updateData,
      });
    }
  }

  // ============================================================================
  // Transaction Execution Methods
  // ============================================================================

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

    const eventData = assignClientContext(data, clientContext);
    // Filter event data
    const events = await this.filterEventDataByAttributes(event.id, eventData);
    if (!events) {
      return false;
    }

    // Create and validate business event using the already fetched session
    // Type assertion is safe because bizSession includes bizEvent with event relation
    const isEventCreated = await this.handleEventCreation(
      tx,
      bizSession,
      event.id,
      eventCodeName,
      events,
    );

    if (!isEventCreated) {
      return false;
    }

    // Update seen attributes
    await this.updateSeenAttributes(tx, bizUser, bizSession.bizCompanyId);

    // Update biz session
    await this.updateBizSession(tx, bizSession, eventCodeName, events);

    return true;
  }

  // ============================================================================
  // Event Handler Registration
  // ============================================================================

  /**
   * Register all event handlers
   */
  private registerEventHandlers(): void {
    const register = (config: EventHandlerConfig) => {
      this.eventHandlers.set(config.eventName, {
        handle: async (params: EventTrackingParams) => {
          return this.trackEventWithSession(
            params.sessionId,
            params.environment,
            params.clientContext,
            config.eventName,
            (session) => config.buildEventData(session, params),
          );
        },
      });
    };

    // Flow events
    register({
      eventName: BizEvents.FLOW_ENDED,
      buildEventData: (session, params) => buildFlowEndedEventData(session, params.endReason),
    });

    register({
      eventName: BizEvents.TOOLTIP_TARGET_MISSING,
      buildEventData: (session, params) => buildStepEventData(session, params.stepId),
    });

    // Checklist events
    register({
      eventName: BizEvents.CHECKLIST_SEEN,
      buildEventData: (session) => buildChecklistBaseEventData(session),
    });

    register({
      eventName: BizEvents.CHECKLIST_HIDDEN,
      buildEventData: (session) => buildChecklistBaseEventData(session),
    });

    register({
      eventName: BizEvents.CHECKLIST_COMPLETED,
      buildEventData: (session) => buildChecklistBaseEventData(session),
    });

    register({
      eventName: BizEvents.CHECKLIST_DISMISSED,
      buildEventData: (session, params) =>
        buildChecklistDismissedEventData(session, params.endReason),
    });

    register({
      eventName: BizEvents.CHECKLIST_TASK_CLICKED,
      buildEventData: (session, params) => buildChecklistTaskEventData(session, params.taskId),
    });

    register({
      eventName: BizEvents.CHECKLIST_TASK_COMPLETED,
      buildEventData: (session, params) => buildChecklistTaskEventData(session, params.taskId),
    });

    // Launcher events
    register({
      eventName: BizEvents.LAUNCHER_ACTIVATED,
      buildEventData: (session) => buildLauncherBaseEventData(session),
    });

    register({
      eventName: BizEvents.LAUNCHER_DISMISSED,
      buildEventData: (session, params) =>
        buildLauncherDismissedEventData(session, params.endReason),
    });
  }

  // ============================================================================
  // Generic Event Tracking Methods
  // ============================================================================

  /**
   * Unified event tracking method with routing
   * Routes events to appropriate handlers based on event type
   * @param eventType - The event type to track
   * @param params - Event tracking parameters
   * @returns True if the event was tracked successfully
   */
  async trackEventByType(eventType: BizEvents, params: EventTrackingParams): Promise<boolean> {
    const handler = this.eventHandlers.get(eventType);

    if (!handler) {
      this.logger.warn(`No handler found for event type: ${eventType}`);
      return false;
    }

    try {
      return await handler.handle(params);
    } catch (error) {
      this.logger.error({
        message: `Error tracking event ${eventType}: ${error.message}`,
        stack: error.stack,
        sessionId: params.sessionId,
        params: params,
      });
      return false;
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
   * Generic method to track events with standard flow:
   * 1. Validate session
   * 2. Build event data (return null if validation fails)
   * 3. Track event
   *
   * @param sessionId - Session ID
   * @param environment - Environment
   * @param clientContext - Client context
   * @param eventName - Event name (BizEvents enum)
   * @param buildEventData - Function to build event data from session (return null if validation fails)
   * @returns True if event was tracked successfully
   */
  private async trackEventWithSession(
    sessionId: string,
    environment: Environment,
    clientContext: ClientContext,
    eventName: string,
    buildEventData: (session: BizSessionWithRelations) => Record<string, any> | null,
  ): Promise<boolean> {
    // Step 1: Get session for tracking
    const bizSession = await this.getTrackingSession(sessionId);
    if (!bizSession) {
      return false;
    }

    // Step 2: Build event data (return null if validation fails)
    const eventData = buildEventData(bizSession);

    if (!eventData) {
      return false;
    }

    // Step 3: Get external user ID from session
    const externalUserId = String(bizSession.bizUser.externalId);

    // Step 4: Track event directly using executeEventTransaction to avoid duplicate session query
    return await this.prisma.$transaction(async (tx) => {
      return await this.executeEventTransaction(
        tx,
        environment,
        externalUserId,
        eventName,
        bizSession.id,
        eventData,
        clientContext,
      );
    });
  }

  // ============================================================================
  // Question Event Tracking Methods
  // ============================================================================

  /**
   * Track question answered event
   * @param params - The parameters for the question answered event
   * @param environment - The environment
   * @param clientContext - The client context
   * @returns True if the event was tracked successfully
   */
  async trackQuestionAnsweredEvent(
    params: AnswerQuestionDto,
    environment: Environment,
    clientContext: ClientContext,
  ): Promise<boolean> {
    const bizSession = await this.getTrackingSession(params.sessionId);
    if (!bizSession) return false;

    const eventData = buildQuestionAnsweredEventData(bizSession, params);
    const answer = getAnswer(eventData);
    const externalUserId = String(bizSession.bizUser.externalId);
    const bindToAttribute = extractStepBindToAttribute(
      bizSession.version.steps as unknown as Step[],
      params.questionCvid,
    );

    return await this.prisma.$transaction(async (tx) => {
      if (bindToAttribute && answer) {
        await this.bizService.upsertBizUsers(
          tx,
          externalUserId,
          { [bindToAttribute]: answer },
          environment.id,
        );
      }
      return await this.executeEventTransaction(
        tx,
        environment,
        externalUserId,
        BizEvents.QUESTION_ANSWERED,
        bizSession.id,
        eventData,
        clientContext,
      );
    });
  }

  // ============================================================================
  // Auto Start and Go To Step Methods
  // ============================================================================

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
        eventData: buildFlowStartEventData(customContentVersion, startReason),
      };
    }

    if (contentType === ContentDataType.CHECKLIST) {
      return {
        eventName: BizEvents.CHECKLIST_STARTED,
        eventData: buildChecklistStartEventData(customContentVersion, startReason),
      };
    }

    if (contentType === ContentDataType.LAUNCHER) {
      return {
        eventName: BizEvents.LAUNCHER_SEEN,
        eventData: buildLauncherSeenEventData(customContentVersion, startReason),
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
    const bizSession = await this.getTrackingSession(sessionId, tx);
    if (!bizSession) {
      return;
    }
    // Build go to step event data
    const eventData = buildStepEventData(bizSession, stepId);
    if (!eventData) {
      return;
    }

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
    if (eventData[EventAttributes.FLOW_STEP_PROGRESS] === 100) {
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

  // ============================================================================
  // Generic Content Methods
  // ============================================================================

  /**
   * Track content ended event based on content type
   * This method abstracts the logic of tracking different content end events
   * based on the content type (FLOW, CHECKLIST, or LAUNCHER)
   * @param sessionId - The session ID
   * @param environment - The environment
   * @param clientContext - The client context
   * @param endReason - The end reason
   * @returns True if the event was tracked successfully, false otherwise
   */
  async trackContentEndedEvent(
    sessionId: string,
    environment: Environment,
    clientContext: ClientContext,
    endReason: string,
  ): Promise<boolean> {
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { content: true },
    });

    if (!bizSession?.content) {
      return false;
    }

    const contentType = bizSession.content.type as ContentDataType;

    if (contentType === ContentDataType.FLOW) {
      return await this.trackEventByType(BizEvents.FLOW_ENDED, {
        sessionId,
        environment,
        clientContext,
        endReason,
      });
    }

    if (contentType === ContentDataType.CHECKLIST) {
      return await this.trackEventByType(BizEvents.CHECKLIST_DISMISSED, {
        sessionId,
        environment,
        clientContext,
        endReason,
      });
    }

    if (contentType === ContentDataType.LAUNCHER) {
      return await this.trackEventByType(BizEvents.LAUNCHER_DISMISSED, {
        sessionId,
        environment,
        clientContext,
        endReason,
      });
    }

    return false;
  }
}
