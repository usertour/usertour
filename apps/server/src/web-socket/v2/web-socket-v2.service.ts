import { BizService } from '@/biz/biz.service';
import { Injectable, Logger } from '@nestjs/common';
import { Environment } from '@/common/types/schema';
import { PrismaService } from 'nestjs-prisma';
import {
  UpsertUserDto,
  UpsertCompanyDto,
  GoToStepDto,
  ClickChecklistTaskDto,
  HideChecklistDto,
  ShowChecklistDto,
  TooltipTargetMissingDto,
  TrackEventDto,
  StartContentDto,
  EndContentDto,
  FireConditionWaitTimerDto,
  SocketAuthData,
  ActivateLauncherDto,
  DismissLauncherDto,
  ContentDataType,
  ClientContext,
  contentStartReason,
  contentEndReason,
  AnswerQuestionDto,
  BizEvents,
  ClientCondition,
  CustomContentSession,
} from '@usertour/types';
import { WebSocketContext } from './web-socket-v2.dto';
import { Server, Socket } from 'socket.io';
import { SocketDataService } from '../core/socket-data.service';
import { ContentCancelContext, ContentStartContext, SocketData } from '@/common/types/content';
import { EventTrackingService } from '@/web-socket/core/event-tracking.service';
import { ContentOrchestratorService } from '@/web-socket/core/content-orchestrator.service';

@Injectable()
export class WebSocketV2Service {
  private readonly logger = new Logger(WebSocketV2Service.name);

  constructor(
    private prisma: PrismaService,
    private bizService: BizService,
    private eventTrackingService: EventTrackingService,
    private readonly contentOrchestratorService: ContentOrchestratorService,
    private readonly socketDataService: SocketDataService,
  ) {}

  // ============================================================================
  // Socket Data Management Methods
  // ============================================================================

  /**
   * Get socket data from Redis
   * @param socket - The socket instance
   * @returns Promise<SocketData | null>
   */
  async getSocketData(socket: Socket): Promise<SocketData | null> {
    return await this.socketDataService.get(socket.id);
  }

  /**
   * Update socket data in Redis
   * @param socket - The socket instance
   * @param updates - Partial data to update
   * @returns Promise<boolean>
   */
  private async updateSocketData(socket: Socket, updates: Partial<SocketData>): Promise<boolean> {
    return await this.socketDataService.set(socket.id, updates, true);
  }

  /**
   * Fetch environment by token
   * @param token - The token
   * @returns The environment or null if not found
   */
  private async fetchEnvironmentByToken(token: string): Promise<Environment | null> {
    return await this.prisma.environment.findFirst({ where: { token } });
  }

  /**
   * Initialize and validate socket data from socket handshake auth
   * @param auth - Authentication data from socket handshake
   * @returns Initialized SocketData or null if validation fails
   */
  async initializeSocketData(auth: SocketAuthData): Promise<SocketData | null> {
    const { externalUserId, externalCompanyId, clientContext, clientConditions = [], token } = auth;

    // Validate required fields
    if (!externalUserId || !token) {
      return null;
    }

    // Fetch and validate environment
    const environment = await this.fetchEnvironmentByToken(token);
    if (!environment) {
      return null;
    }

    // Build base socket data
    const socketData: SocketData = {
      environment,
      externalUserId,
      clientContext,
      externalCompanyId,
      waitTimers: [],
      clientConditions,
    };

    // Initialize and assign sessions
    return await this.initializeSessions(socketData, auth);
  }

  /**
   * Initialize and assign sessions to socket data
   * @param socketData - The socket data to update
   * @param auth - Authentication data containing session IDs
   * @returns The socket data with initialized sessions
   */
  private async initializeSessions(
    socketData: SocketData,
    auth: SocketAuthData,
  ): Promise<SocketData> {
    const { flowSessionId, checklistSessionId, launchers = [] } = auth;

    // Initialize sessions in parallel (flow and checklist can be initialized concurrently)
    const [flowSession, checklistSession, launcherSessions] = await Promise.all([
      flowSessionId ? this.initializeSessionById(socketData, flowSessionId) : Promise.resolve(null),
      checklistSessionId
        ? this.initializeSessionById(socketData, checklistSessionId)
        : Promise.resolve(null),
      launchers.length > 0
        ? this.initializeLauncherSessions(socketData, launchers)
        : Promise.resolve([]),
    ]);

    // Assign sessions to socket data if they exist
    if (flowSession) {
      socketData.flowSession = flowSession;
    }
    if (checklistSession) {
      socketData.checklistSession = checklistSession;
    }
    if (launcherSessions.length > 0) {
      socketData.launcherSessions = launcherSessions;
    }

    return socketData;
  }

  // ============================================================================
  // Business Data Operation Methods
  // ============================================================================

  /**
   * Upsert business users
   * @param context - The web socket context
   * @param data - The data to upsert
   * @returns The upserted business users
   */
  async upsertBizUsers(context: WebSocketContext, data: UpsertUserDto): Promise<boolean> {
    const { socket, socketData } = context;
    const { environment } = socketData;

    const { externalUserId, attributes } = data;
    const bizUser = await this.bizService.upsertBizUsers(
      this.prisma,
      externalUserId,
      attributes,
      environment.id,
    );
    if (!bizUser) return false;
    return await this.updateSocketData(socket, { externalUserId });
  }

  /**
   * Upsert business companies
   * @param context - The web socket context
   * @param data - The data to upsert
   * @returns The upserted business companies
   */
  async upsertBizCompanies(context: WebSocketContext, data: UpsertCompanyDto): Promise<boolean> {
    const { socket, socketData } = context;
    const { environment } = socketData;

    const { externalCompanyId, externalUserId, attributes, membership } = data;
    const bizCompany = await this.bizService.upsertBizCompanies(
      this.prisma,
      externalCompanyId,
      externalUserId,
      attributes,
      environment.id,
      membership,
    );

    if (!bizCompany) return false;
    return await this.updateSocketData(socket, { externalCompanyId });
  }

  /**
   * Update socket context
   * @param context - The web socket context
   * @param clientContext - The socket context
   * @returns True if the socket context was updated successfully
   */
  async updateClientContext(
    context: WebSocketContext,
    clientContext: ClientContext,
  ): Promise<boolean> {
    const { socket } = context;
    return await this.updateSocketData(socket, { clientContext });
  }

  // ============================================================================
  // Content Management Methods
  // ============================================================================

  /**
   * Start content
   * @param context - The web socket context
   * @param startContentDto - The parameters for the start content event
   * @returns True if the content was started successfully
   */
  async startContent(
    context: WebSocketContext,
    startContentDto: StartContentDto,
  ): Promise<boolean> {
    const { server, socket, socketData } = context;

    const { contentId } = startContentDto;
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });
    // Check if the content exists
    if (!content) return false;
    const contentType = content.type as ContentDataType;
    const startContentContext: ContentStartContext = {
      server,
      socket,
      contentType,
      socketData,
      options: startContentDto,
    };
    if (contentType === ContentDataType.LAUNCHER) {
      return await this.contentOrchestratorService.addLaunchers(startContentContext);
    }
    // Start the content
    return await this.contentOrchestratorService.startContent(startContentContext);
  }

  /**
   * End content
   * @param context - The web socket context
   * @param endContentDto - The end content DTO
   * @returns True if the event was tracked successfully
   */
  async endContent(context: WebSocketContext, endContentDto: EndContentDto): Promise<boolean> {
    const { server, socket } = context;
    const { sessionId, endReason } = endContentDto;

    const success = await this.contentOrchestratorService.cancelContent({
      server,
      socket,
      sessionId,
      unsetCurrentSession: false,
      cancelOtherSessions: true,
      endReason,
    });
    const contentTypes = [ContentDataType.CHECKLIST, ContentDataType.FLOW];
    await this.toggleContents(server, socket, contentTypes);
    return success;
  }

  /**
   * End all content
   * @param context - The web socket context
   * @returns True if the all content was ended successfully
   */
  async endAllContent(context: WebSocketContext): Promise<boolean> {
    const { server, socket, socketData } = context;
    const { flowSession, checklistSession, launcherSessions = [] } = socketData;

    // Collect all sessions to cancel
    const sessionsToCancel: CustomContentSession[] = [];
    if (flowSession) {
      sessionsToCancel.push(flowSession);
    }
    if (checklistSession) {
      sessionsToCancel.push(checklistSession);
    }
    sessionsToCancel.push(...launcherSessions);

    if (sessionsToCancel.length === 0) {
      return true;
    }

    const endContentContext: Omit<ContentCancelContext, 'sessionId'> = {
      server,
      socket,
      endReason: contentEndReason.END_FROM_PROGRAM,
      unsetCurrentSession: true,
      cancelOtherSessions: true,
    };

    // Cancel all sessions
    await Promise.allSettled(
      sessionsToCancel.map((session) => {
        const context: ContentCancelContext = {
          ...endContentContext,
          sessionId: session.id,
        };
        if (session.content.type === ContentDataType.LAUNCHER) {
          return this.contentOrchestratorService.dismissLauncher(context);
        }
        return this.contentOrchestratorService.cancelContent(context);
      }),
    );

    return true;
  }

  /**
   * End batch
   * @param context - The web socket context
   * @returns True if the batch was ended successfully
   */
  async endBatch(context: WebSocketContext): Promise<boolean> {
    const { server, socket } = context;

    const contentTypes = [
      ContentDataType.CHECKLIST,
      ContentDataType.FLOW,
      ContentDataType.LAUNCHER,
    ];
    return await this.toggleContents(server, socket, contentTypes);
  }

  /**
   * Toggle contents for the socket
   * This method will start content types specified by the caller, handling session cleanup and restart
   * @param server - The server instance
   * @param socket - The socket instance
   * @param contentTypes - Array of content types to toggle
   * @returns True if the contents were toggled successfully
   */
  async toggleContents(
    server: Server,
    socket: Socket,
    contentTypes: ContentDataType[],
  ): Promise<boolean> {
    // Start content asynchronously without waiting for completion
    // This allows toggleContents to return immediately while startContent runs in background
    const context = {
      server,
      socket,
      options: {
        startReason: contentStartReason.START_FROM_CONDITION,
      },
    };

    // Handle checklist completed events
    const checklistContentTypes = [ContentDataType.CHECKLIST, ContentDataType.FLOW];
    if (checklistContentTypes.some((type) => contentTypes.includes(type))) {
      await this.contentOrchestratorService.handleChecklistCompletedEvents(socket);
    }

    // Start content types
    return await this.contentOrchestratorService.startContentsByTypes(context, contentTypes);
  }

  // ============================================================================
  // Event Tracking Methods
  // ============================================================================

  /**
   * Track event
   * @param context - The web socket context
   * @param trackEventDto - The track event DTO
   * @returns True if the event was tracked successfully
   */
  async trackEvent(context: WebSocketContext, trackEventDto: TrackEventDto): Promise<boolean> {
    const { socketData } = context;
    const { environment, externalUserId, clientContext } = socketData;

    const { eventName, sessionId, eventData } = trackEventDto;
    const eventTransactionParams = {
      environment,
      externalUserId,
      eventName,
      sessionId,
      data: eventData,
      clientContext,
    };
    return await this.eventTrackingService.trackCustomEvent(eventTransactionParams);
  }

  /**
   * Go to step
   * @param context - The web socket context
   * @param params - The parameters for the go to step event
   * @returns True if the event was tracked successfully
   */
  async goToStep(context: WebSocketContext, params: GoToStepDto): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackEventByType(BizEvents.FLOW_STEP_SEEN, {
      sessionId: params.sessionId,
      environment,
      clientContext,
      stepId: params.stepId,
    });
  }

  /**
   * Answer question
   * @param context - The web socket context
   * @param params - The parameters for the answer question event
   * @returns True if the event was tracked successfully
   */
  async answerQuestion(context: WebSocketContext, params: AnswerQuestionDto): Promise<boolean> {
    const { socketData, server, socket } = context;
    const { environment, clientContext } = socketData;
    const success = await this.eventTrackingService.trackEventByType(BizEvents.QUESTION_ANSWERED, {
      sessionId: params.sessionId,
      environment,
      clientContext,
      answer: params,
    });
    await this.toggleContents(server, socket, [ContentDataType.FLOW]);

    return success;
  }

  /**
   * Click checklist task
   * @param context - The web socket context
   * @param params - The parameters for the click checklist task event
   * @returns True if the event was tracked successfully
   */
  async clickChecklistTask(
    context: WebSocketContext,
    params: ClickChecklistTaskDto,
  ): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackEventByType(BizEvents.CHECKLIST_TASK_CLICKED, {
      sessionId: params.sessionId,
      environment,
      clientContext,
      taskId: params.taskId,
    });
  }

  /**
   * Hide checklist
   * @param context - The web socket context
   * @param params - The parameters for the hide checklist event
   * @returns True if the event was tracked successfully
   */
  async hideChecklist(context: WebSocketContext, params: HideChecklistDto): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackEventByType(BizEvents.CHECKLIST_HIDDEN, {
      sessionId: params.sessionId,
      environment,
      clientContext,
    });
  }

  /**
   * Show checklist
   * @param context - The web socket context
   * @param params - The parameters for the show checklist event
   * @returns True if the event was tracked successfully
   */
  async showChecklist(context: WebSocketContext, params: ShowChecklistDto): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackEventByType(BizEvents.CHECKLIST_SEEN, {
      sessionId: params.sessionId,
      environment,
      clientContext,
    });
  }

  /**
   * Report tooltip target missing
   * @param context - The web socket context
   * @param params - The parameters for the tooltip target missing event
   * @returns True if the event was tracked successfully
   */
  async reportTooltipTargetMissing(
    context: WebSocketContext,
    params: TooltipTargetMissingDto,
  ): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackEventByType(BizEvents.TOOLTIP_TARGET_MISSING, {
      sessionId: params.sessionId,
      environment,
      clientContext,
      stepId: params.stepId,
    });
  }

  /**
   * Activate launcher
   * @param context - The web socket context
   * @param params - The parameters for the activate launcher event
   * @returns True if the event was tracked successfully
   */
  async activateLauncher(context: WebSocketContext, params: ActivateLauncherDto): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    const { sessionId } = params;
    return await this.eventTrackingService.trackEventByType(BizEvents.LAUNCHER_ACTIVATED, {
      sessionId,
      environment,
      clientContext,
    });
  }

  /**
   * Dismiss launcher
   * @param context - The web socket context
   * @param params - The parameters for the dismiss launcher event
   * @returns True if the launcher was dismissed successfully
   */
  async dismissLauncher(context: WebSocketContext, params: DismissLauncherDto): Promise<boolean> {
    const { server, socket } = context;
    const { sessionId, endReason } = params;
    const dismissLauncherContext: ContentCancelContext = {
      server,
      socket,
      sessionId,
      endReason,
      unsetCurrentSession: false,
      cancelOtherSessions: true,
    };
    return await this.contentOrchestratorService.dismissLauncher(dismissLauncherContext);
  }

  // ============================================================================
  // Condition Management Methods
  // ============================================================================

  /**
   * Toggle the isActive status of a specific socket condition by condition ID
   * Handles timing issues by creating the condition if it doesn't exist yet
   * Now simplified as message queue ensures ordered execution
   * @param context - The web socket context
   * @param clientCondition - The client condition
   * @returns True if the condition was toggled successfully
   */
  async toggleClientCondition(
    context: WebSocketContext,
    clientCondition: ClientCondition,
  ): Promise<boolean> {
    const { socket, socketData } = context;

    const existingConditions = socketData.clientConditions || [];
    const conditionExists = existingConditions.some(
      (c) => c.conditionId === clientCondition.conditionId,
    );

    // Only update if condition exists, don't add new ones
    if (!conditionExists) {
      return false;
    }

    // Update existing condition
    const updatedConditions = existingConditions.map((c) =>
      c.conditionId === clientCondition.conditionId ? clientCondition : c,
    );

    return await this.updateSocketData(socket, {
      clientConditions: updatedConditions,
    });
  }

  /**
   * Fire condition wait timer
   * @param context - The web socket context
   * @param fireConditionWaitTimerDto - The DTO containing the version ID
   * @returns True if the wait timer was fired successfully
   */
  async fireConditionWaitTimer(
    context: WebSocketContext,
    fireConditionWaitTimerDto: FireConditionWaitTimerDto,
  ): Promise<boolean> {
    const { socket, socketData } = context;

    const { versionId } = fireConditionWaitTimerDto;
    const { waitTimers = [] } = socketData;

    // Check if condition exists
    const targetCondition = waitTimers.find((c) => c.versionId === versionId);
    if (!targetCondition) {
      return false;
    }

    // Update the condition
    const updatedCondition = {
      ...targetCondition,
      activated: true,
    };

    // Update socket data
    return await this.updateSocketData(socket, {
      waitTimers: waitTimers.map((condition) =>
        condition.versionId === versionId ? updatedCondition : condition,
      ),
    });
  }

  // ============================================================================
  // Session Initialization Methods
  // ============================================================================

  /**
   * Initialize content session
   * @param socketData - The socket client data
   * @param sessionId - The session ID
   * @returns The content session or null
   */
  async initializeSessionById(
    socketData: SocketData,
    sessionId: string,
  ): Promise<CustomContentSession | null> {
    return await this.contentOrchestratorService.initializeSessionById(socketData, sessionId);
  }

  /**
   * Initialize launcher sessions by content IDs
   * @param socketData - The socket client data
   * @param launcherIds - Array of launcher content IDs
   * @returns Array of initialized sessions
   */
  async initializeLauncherSessions(
    socketData: SocketData,
    launcherIds: string[],
  ): Promise<CustomContentSession[]> {
    const launcherSessions: CustomContentSession[] = [];
    for (const launcherId of launcherIds) {
      const launcherSession = await this.contentOrchestratorService.initializeLauncherSession(
        socketData,
        launcherId,
      );
      if (launcherSession) {
        launcherSessions.push(launcherSession);
      }
    }
    return launcherSessions;
  }
}
