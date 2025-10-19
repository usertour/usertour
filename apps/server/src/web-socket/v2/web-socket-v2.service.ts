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
} from './web-socket-v2.dto';
import {
  EventAttributes,
  BizEvents,
  ChecklistData,
  ContentDataType,
  ClientContext,
  contentStartReason,
} from '@usertour/types';
import { isUndefined } from '@usertour/helpers';
import { Server, Socket } from 'socket.io';
import { SocketDataService } from '../core/socket-data.service';
import { SocketData } from '@/common/types/content';
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
  async initializeSocketData(auth: Record<string, unknown>): Promise<SocketData | null> {
    const externalUserId = String(auth.externalUserId ?? '');
    const externalCompanyId = String(auth.externalCompanyId ?? '');
    const clientContext = auth.clientContext as ClientContext;
    const clientConditions = (auth.clientConditions as ClientCondition[]) ?? [];
    const token = String(auth.token ?? '');
    const flowSessionId = String(auth.flowSessionId ?? '');
    const checklistSessionId = String(auth.checklistSessionId ?? '');

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

    return Boolean(
      await this.eventTrackingService.trackEvent(
        environment,
        externalUserId,
        BizEvents.QUESTION_ANSWERED,
        bizSession.id,
        eventData,
        clientContext,
      ),
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
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: params.sessionId },
      include: { bizUser: true, content: true, version: { include: { steps: true } } },
    });
    if (!bizSession) return false;
    const content = bizSession.content;
    const version = bizSession.version;
    const checklistData = version.data as unknown as ChecklistData;
    const checklistItem = checklistData.items.find((item) => item.id === params.taskId);
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

    return Boolean(
      await this.eventTrackingService.trackEvent(
        environment,
        externalUserId,
        BizEvents.CHECKLIST_TASK_CLICKED,
        bizSession.id,
        eventData,
        clientContext,
      ),
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
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: params.sessionId },
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
    return Boolean(
      await this.eventTrackingService.trackEvent(
        environment,
        externalUserId,
        BizEvents.CHECKLIST_HIDDEN,
        bizSession.id,
        eventData,
        clientContext,
      ),
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
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: params.sessionId },
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
    return Boolean(
      await this.eventTrackingService.trackEvent(
        environment,
        externalUserId,
        BizEvents.CHECKLIST_SEEN,
        bizSession.id,
        eventData,
        clientContext,
      ),
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
    const { sessionId, stepId } = params;
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
    await this.eventTrackingService.trackEvent(
      environment,
      externalUserId,
      BizEvents.TOOLTIP_TARGET_MISSING,
      bizSession.id,
      eventData,
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
    const { server, socket, socketData } = context;

    return await this.toggleContents(server, socket, [ContentDataType.FLOW], socketData);
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
    const allowedTypes = [ContentDataType.FLOW, ContentDataType.CHECKLIST];
    // Check if the content exists
    if (!content) return false;
    const contentType = content.type as ContentDataType;
    // Only allow FLOW and CHECKLIST content types
    if (!allowedTypes.includes(contentType)) return false;
    // Start the content
    return await this.contentOrchestratorService.startContent({
      server,
      socket,
      contentType,
      socketData,
      options: startContentDto,
    });
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

    const { sessionId, reason } = endContentDto;
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { content: true },
    });
    if (!bizSession) return false;
    const contentType = bizSession.content.type as ContentDataType;
    if (contentType === ContentDataType.FLOW) {
      // Track flow ended event
      const trackResult = await this.eventTrackingService.trackFlowEndedEvent(
        bizSession,
        environment,
        externalUserId,
        reason,
        clientContext,
      );
      if (!trackResult) return false;
    }
    if (contentType === ContentDataType.CHECKLIST) {
      // Track checklist dismissed event
      const trackResult = await this.eventTrackingService.trackChecklistDismissedEvent(
        sessionId,
        environment,
        clientContext,
        reason,
      );
      if (!trackResult) return false;
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
  async toggleContents(
    server: Server,
    socket: Socket,
    contentTypes: ContentDataType[],
    socketData?: SocketData,
  ): Promise<boolean> {
    // If socketData is not provided, fetch it using getSocketDataResolved
    const resolvedSocketData = socketData ?? (await this.getSocketData(socket));

    if (!resolvedSocketData) return false;

    // Start content asynchronously without waiting for completion
    // This allows toggleContents to return immediately while startContent runs in background
    const context = {
      server,
      socket,
      socketData: resolvedSocketData,
      options: {
        startReason: contentStartReason.START_FROM_CONDITION,
      },
    };

    for (const contentType of contentTypes) {
      await this.contentOrchestratorService.startContent({
        ...context,
        contentType,
      });
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
}
