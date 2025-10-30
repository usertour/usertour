import { BizService } from '@/biz/biz.service';
import { Injectable, Logger } from '@nestjs/common';
import { Environment } from '@/common/types/schema';
import { PrismaService } from 'nestjs-prisma';
import {
  UpsertUserDto,
  UpsertCompanyDto,
  GoToStepDto,
  AnswerQuestionDto,
  ClickChecklistTaskDto,
  HideChecklistDto,
  ShowChecklistDto,
  TooltipTargetMissingDto,
  TrackEventDto,
  StartContentDto,
  EndContentDto,
  FireConditionWaitTimerDto,
  WebSocketContext,
  SocketAuthData,
  ActivateLauncherDto,
} from './web-socket-v2.dto';
import { ContentDataType, ClientContext, contentStartReason } from '@usertour/types';
import { Server, Socket } from 'socket.io';
import { SocketDataService } from '../core/socket-data.service';
import { ContentStartContext, SocketData } from '@/common/types/content';
import { EventTrackingService } from '@/web-socket/core/event-tracking.service';
import { ContentOrchestratorService } from '@/web-socket/core/content-orchestrator.service';
import { ClientCondition, CustomContentSession } from '@/common/types/sdk';

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
   * Upsert business users
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
   * @param socket - The socket instance
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
   * @param socket - The socket instance
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

  /**
   * Track event
   * @param socket - The socket instance
   * @param trackEventDto - The track event DTO
   * @returns True if the event was tracked successfully
   */
  async trackEvent(context: WebSocketContext, trackEventDto: TrackEventDto): Promise<boolean> {
    const { socketData } = context;
    const { environment, externalUserId, clientContext } = socketData;

    const { eventName, sessionId, eventData } = trackEventDto;
    return Boolean(
      await this.eventTrackingService.trackEvent(
        environment,
        externalUserId,
        eventName,
        sessionId,
        eventData,
        clientContext,
      ),
    );
  }

  /**
   * Fetch environment by token
   * @param token - The token
   * @returns The environment or null if not found
   */
  async fetchEnvironmentByToken(token: string): Promise<Environment | null> {
    return await this.prisma.environment.findFirst({ where: { token } });
  }

  /**
   * Initialize and validate socket data from socket handshake auth
   * @param auth - Authentication data from socket handshake
   * @returns Initialized SocketData or null if validation fails
   */
  async initializeSocketData(auth: SocketAuthData): Promise<SocketData | null> {
    const {
      externalUserId,
      externalCompanyId,
      clientContext,
      clientConditions = [],
      token,
      flowSessionId,
      checklistSessionId,
      launchers = [],
    } = auth;

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

    // Initialize flow session if provided
    if (flowSessionId) {
      const flowSession = await this.initializeSessionById(socketData, flowSessionId);
      if (flowSession) {
        socketData.flowSession = flowSession;
      }
    }

    // Initialize checklist session if provided
    if (checklistSessionId) {
      const checklistSession = await this.initializeSessionById(socketData, checklistSessionId);
      if (checklistSession) {
        socketData.checklistSession = checklistSession;
      }
    }

    if (launchers.length > 0) {
      const launcherSessions = await this.initializeLauncherSessions(socketData, launchers);
      if (launcherSessions.length > 0) {
        socketData.launcherSessions = launcherSessions;
      }
    }

    return socketData;
  }

  /**
   * Go to step
   * @param socket - The socket instance
   * @param params - The parameters for the go to step event
   * @returns True if the event was tracked successfully
   */
  async goToStep(context: WebSocketContext, params: GoToStepDto): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackGoToStepEvent(
      params.sessionId,
      params.stepId,
      environment,
      clientContext,
    );
  }

  /**
   * Answer question
   * @param socket - The socket instance
   * @param params - The parameters for the answer question event
   * @returns True if the event was tracked successfully
   */
  async answerQuestion(context: WebSocketContext, params: AnswerQuestionDto): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackQuestionAnsweredEvent(
      params,
      environment,
      clientContext,
    );
  }

  /**
   * Click checklist task
   * @param socket - The socket instance
   * @param params - The parameters for the click checklist task event
   * @returns True if the event was tracked successfully
   */
  async clickChecklistTask(
    context: WebSocketContext,
    params: ClickChecklistTaskDto,
  ): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackChecklistTaskClickedEvent(
      params.sessionId,
      environment,
      clientContext,
      params.taskId,
    );
  }

  /**
   * Hide checklist
   * @param socket - The socket instance
   * @param params - The parameters for the hide checklist event
   * @returns True if the event was tracked successfully
   */
  async hideChecklist(context: WebSocketContext, params: HideChecklistDto): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackChecklistHiddenEvent(
      params.sessionId,
      environment,
      clientContext,
    );
  }

  /**
   * Show checklist
   * @param socket - The socket instance
   * @param params - The parameters for the show checklist event
   * @returns True if the event was tracked successfully
   */
  async showChecklist(context: WebSocketContext, params: ShowChecklistDto): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackChecklistSeenEvent(
      params.sessionId,
      environment,
      clientContext,
    );
  }

  /**
   * Report tooltip target missing
   * @param socket - The socket instance
   * @param params - The parameters for the tooltip target missing event
   * @returns True if the event was tracked successfully
   */
  async reportTooltipTargetMissing(
    context: WebSocketContext,
    params: TooltipTargetMissingDto,
  ): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackTooltipTargetMissingEvent(
      params.sessionId,
      params.stepId,
      environment,
      clientContext,
    );
  }

  /**
   * Activate launcher
   * @param socket - The socket instance
   * @param params - The parameters for the activate launcher event
   * @returns True if the event was tracked successfully
   */
  async activateLauncher(context: WebSocketContext, params: ActivateLauncherDto): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    const { sessionId } = params;
    return await this.eventTrackingService.trackLauncherActivatedEvent(
      sessionId,
      environment,
      clientContext,
    );
  }

  /**
   * End batch
   * @param server - The server instance
   * @param socket - The socket instance
   * @returns True if the batch was ended successfully
   */
  async endBatch(context: WebSocketContext): Promise<boolean> {
    const { server, socket } = context;

    return await this.toggleContents(server, socket);
  }

  /**
   * Start content
   * @param server - The server instance
   * @param socket - The socket instance
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
      return await this.contentOrchestratorService.startLaunchers(startContentContext);
    }
    // Start the content
    return await this.contentOrchestratorService.startContent(startContentContext);
  }

  /**
   * End content
   * @param socket - The socket instance
   * @param endContentDto - The end content DTO
   * @returns True if the event was tracked successfully
   */
  async endContent(context: WebSocketContext, endContentDto: EndContentDto): Promise<boolean> {
    const { server, socket, socketData } = context;
    const { externalUserId, environment, clientContext } = socketData;

    const { sessionId, endReason } = endContentDto;
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { content: true },
    });
    if (!bizSession) return false;
    const contentType = bizSession.content.type as ContentDataType;
    if (contentType === ContentDataType.FLOW) {
      // Track flow ended event
      const isEventTracked = await this.eventTrackingService.trackFlowEndedEvent(
        bizSession,
        environment,
        externalUserId,
        endReason,
        clientContext,
      );
      if (!isEventTracked) return false;
    }
    if (contentType === ContentDataType.CHECKLIST) {
      // Track checklist dismissed event
      const trackResult = await this.eventTrackingService.trackChecklistDismissedEvent(
        sessionId,
        environment,
        clientContext,
        endReason,
      );
      if (!trackResult) return false;
    }
    if (contentType === ContentDataType.LAUNCHER) {
      // Track launcher dismissed event
      return await this.eventTrackingService.trackLauncherDismissedEvent(
        sessionId,
        environment,
        clientContext,
        endReason,
      );
    }
    return await this.contentOrchestratorService.cancelContent({
      server,
      socket,
      sessionId,
      cancelOtherSessions: true,
    });
  }

  /**
   * Toggle contents for the socket
   * This method will start FLOW and CHECKLIST content, handling session cleanup and restart
   * @param server - The server instance
   * @param socket - The socket instance
   * @param socketData - Optional socket client data, will be fetched if not provided
   * @returns True if the contents were toggled successfully
   */
  async toggleContents(server: Server, socket: Socket): Promise<boolean> {
    const contentTypes = [
      ContentDataType.CHECKLIST,
      ContentDataType.FLOW,
      ContentDataType.LAUNCHER,
    ];

    // Start content asynchronously without waiting for completion
    // This allows toggleContents to return immediately while startContent runs in background
    const context = {
      server,
      socket,
      options: {
        startReason: contentStartReason.START_FROM_CONDITION,
      },
    };

    for (const contentType of contentTypes) {
      const socketData = await this.getSocketData(socket);
      if (!socketData) {
        return false;
      }
      const startContentContext: ContentStartContext = {
        ...context,
        socketData,
        contentType,
      };
      if (contentType === ContentDataType.LAUNCHER) {
        await this.contentOrchestratorService.startLaunchers(startContentContext);
      } else {
        await this.contentOrchestratorService.startContent(startContentContext);
      }
    }

    return true;
  }

  /**
   * Toggle the isActive status of a specific socket condition by condition ID
   * Handles timing issues by creating the condition if it doesn't exist yet
   * Now simplified as message queue ensures ordered execution
   * @param socket - The socket instance
   * @param socketData - The socket client data
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
   * @param socket - The socket instance
   * @param socketData - The socket client data
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
   * @param contentIds - Array of content IDs
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
