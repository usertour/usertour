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
import { BizEvents, CompanyAttributes, EventAttributes, UserAttributes } from '@usertour/types';
import {
  BizCompany,
  BizSession,
  BizUser,
  Step,
  BizSessionWithEvents,
  BizSessionWithRelations,
  Tx,
} from '@/common/types/schema';
import { isNullish } from '@usertour/helpers';
import { extractStepBindToAttribute } from '@/utils/content-question';
import { BizService } from '@/biz/biz.service';
import type {
  EventTrackingParams,
  EventTrackingItem,
  EventHandlerConfig,
  EventHandler,
  EventTransactionParams,
} from '@/common/types/track';

// ============================================================================
// EventTrackingService
// ============================================================================

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
  // Public API Methods
  // ============================================================================

  /**
   * Find business session with user and events
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
   * Unified event tracking method with routing
   * Routes events to appropriate handlers based on event type
   * @param eventType - The event type to track
   * @param params - Event tracking parameters
   * @returns True if the event was tracked successfully
   */
  async trackEventByType(eventType: BizEvents, params: EventTrackingParams): Promise<boolean> {
    return await this.trackEventsByType([{ eventType, params }]);
  }

  /**
   * Track multiple events in a single transaction
   * Routes events to appropriate handlers based on event type
   * @param events - Array of event type and params to track
   * @returns True if all events were tracked successfully
   */
  async trackEventsByType(events: EventTrackingItem[]): Promise<boolean> {
    if (!events || events.length === 0) {
      return false;
    }

    return await this.prisma.$transaction(async (tx) => {
      for (const { eventType, params: eventParams } of events) {
        const handler = this.eventHandlers.get(eventType);

        if (!handler) {
          this.logger.warn(`No handler found for event type: ${eventType}`);
          return false;
        }

        try {
          const success = await handler.handle(tx, eventParams);
          if (!success) {
            return false;
          }
        } catch (error) {
          this.logger.error({
            message: `Error tracking event ${eventType}: ${error.message}`,
            stack: error.stack,
            sessionId: eventParams.sessionId,
            params: eventParams,
          });
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Track a custom event
   * @param params - Event transaction parameters
   * @returns True if the event was tracked successfully
   */
  async trackCustomEvent(params: EventTransactionParams): Promise<boolean> {
    return await this.prisma.$transaction(async (tx) => {
      return await this.executeEventTransaction(tx, params);
    });
  }

  // ============================================================================
  // Session Query Methods
  // ============================================================================

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
  private async findTrackingSession(
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
  // Event Processing Methods
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
  // Attribute Update Methods
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
  // Transaction Execution Methods
  // ============================================================================

  /**
   * Execute event tracking transaction
   */
  private async executeEventTransaction(tx: Tx, params: EventTransactionParams) {
    const {
      environment,
      externalUserId,
      eventName: eventCodeName,
      sessionId,
      data,
      clientContext,
    } = params;
    const { id: environmentId, projectId } = environment;

    // Fetch required entities
    const [bizUser, bizSession, event] = await Promise.all([
      tx.bizUser.findFirst({
        where: { externalId: externalUserId, environmentId },
      }),
      tx.bizSession.findUnique({
        where: { id: sessionId },
        include: {
          content: true,
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

  /**
   * Generic method to track events with standard flow:
   * 1. Validate session
   * 2. Build event data (return null if validation fails)
   * 3. Track event
   *
   * @param tx - Transaction client
   * @param params - Event transaction parameters (without externalUserId and data, which are generated internally)
   * @param buildEventData - Function to build event data from session (return null if validation fails)
   * @returns True if event was tracked successfully
   */
  private async trackEventWithSession(
    tx: Tx,
    params: Omit<EventTransactionParams, 'externalUserId' | 'data'>,
    buildEventData: (session: BizSessionWithRelations) => Record<string, any> | null,
  ): Promise<boolean> {
    // Step 1: Get session for tracking
    const bizSession = await this.findTrackingSession(params.sessionId, tx);
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

    // Step 4: Track event directly using executeEventTransaction
    return await this.executeEventTransaction(tx, {
      ...params,
      externalUserId,
      sessionId: bizSession.id,
      data: eventData,
    });
  }

  // ============================================================================
  // Custom Event Handlers
  // ============================================================================

  /**
   * Handle flow step seen event with conditional FLOW_COMPLETED
   * @param tx - Transaction client
   * @param params - Event tracking parameters
   * @returns True if the event was tracked successfully
   */
  private async handleFlowStepSeen(tx: Tx, params: EventTrackingParams): Promise<boolean> {
    // Track FLOW_STEP_SEEN event
    const success = await this.trackEventWithSession(
      tx,
      {
        sessionId: params.sessionId,
        environment: params.environment,
        clientContext: params.clientContext,
        eventName: BizEvents.FLOW_STEP_SEEN,
      },
      (session) => buildStepEventData(session, params),
    );

    if (!success) {
      return false;
    }

    // Check if we need to track FLOW_COMPLETED
    const bizSession = await this.findTrackingSession(params.sessionId, tx);
    if (!bizSession) {
      return false;
    }

    const eventData = buildStepEventData(bizSession, params);
    if (eventData?.[EventAttributes.FLOW_STEP_PROGRESS] === 100) {
      // Track FLOW_COMPLETED event
      return await this.trackEventWithSession(
        tx,
        {
          sessionId: params.sessionId,
          environment: params.environment,
          clientContext: params.clientContext,
          eventName: BizEvents.FLOW_COMPLETED,
        },
        () => eventData,
      );
    }

    return true;
  }

  /**
   * Handle question answered event with pre-process (update user attributes)
   * @param tx - Transaction client
   * @param params - Event tracking parameters
   * @returns True if the event was tracked successfully
   */
  private async handleQuestionAnswered(tx: Tx, params: EventTrackingParams): Promise<boolean> {
    const bizSession = await this.findTrackingSession(params.sessionId, tx);
    if (!bizSession) {
      return false;
    }

    const eventData = buildQuestionAnsweredEventData(bizSession, params);
    if (!eventData) {
      return false;
    }

    const answer = getAnswer(eventData);
    const externalUserId = String(bizSession.bizUser.externalId);
    const bindToAttribute = extractStepBindToAttribute(
      bizSession.version.steps as unknown as Step[],
      params.answer?.questionCvid,
    );

    // Pre-process: update user attributes if needed
    if (bindToAttribute && answer) {
      await this.bizService.upsertBizUsers(
        tx,
        externalUserId,
        { [bindToAttribute]: answer },
        params.environment.id,
      );
    }

    // Track QUESTION_ANSWERED event
    return await this.trackEventWithSession(
      tx,
      {
        sessionId: params.sessionId,
        environment: params.environment,
        clientContext: params.clientContext,
        eventName: BizEvents.QUESTION_ANSWERED,
      },
      () => eventData,
    );
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
        handle: config.handle
          ? config.handle
          : async (tx: Tx, params: EventTrackingParams) => {
              const eventParams = {
                sessionId: params.sessionId,
                environment: params.environment,
                clientContext: params.clientContext,
                eventName: config.eventName,
              };
              return await this.trackEventWithSession(tx, eventParams, (session) =>
                config.buildEventData(session, params),
              );
            },
      });
    };

    // Flow events
    register({
      eventName: BizEvents.FLOW_STARTED,
      buildEventData: (session, params) => buildFlowStartEventData(session, params),
    });

    register({
      eventName: BizEvents.FLOW_ENDED,
      buildEventData: (session, params) => buildFlowEndedEventData(session, params),
    });

    register({
      eventName: BizEvents.TOOLTIP_TARGET_MISSING,
      buildEventData: (session, params) => buildStepEventData(session, params),
    });

    // Checklist events
    register({
      eventName: BizEvents.CHECKLIST_STARTED,
      buildEventData: (session, params) => buildChecklistStartEventData(session, params),
    });

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
      buildEventData: (session, params) => buildChecklistDismissedEventData(session, params),
    });

    register({
      eventName: BizEvents.CHECKLIST_TASK_CLICKED,
      buildEventData: (session, params) => buildChecklistTaskEventData(session, params),
    });

    register({
      eventName: BizEvents.CHECKLIST_TASK_COMPLETED,
      buildEventData: (session, params) => buildChecklistTaskEventData(session, params),
    });

    // Launcher events
    register({
      eventName: BizEvents.LAUNCHER_SEEN,
      buildEventData: (session, params) => buildLauncherSeenEventData(session, params),
    });

    register({
      eventName: BizEvents.LAUNCHER_ACTIVATED,
      buildEventData: (session) => buildLauncherBaseEventData(session),
    });

    register({
      eventName: BizEvents.LAUNCHER_DISMISSED,
      buildEventData: (session, params) => buildLauncherDismissedEventData(session, params),
    });

    // Flow step seen event with conditional FLOW_COMPLETED
    register({
      eventName: BizEvents.FLOW_STEP_SEEN,
      buildEventData: (session, params) => buildStepEventData(session, params),
      handle: (tx, params) => this.handleFlowStepSeen(tx, params),
    });

    // Question answered event with pre-process (update user attributes)
    register({
      eventName: BizEvents.QUESTION_ANSWERED,
      buildEventData: (session, params) => buildQuestionAnsweredEventData(session, params),
      handle: (tx, params) => this.handleQuestionAnswered(tx, params),
    });
  }
}
