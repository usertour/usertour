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
} from './web-socket-v2.dto';
import {
  EventAttributes,
  BizEvents,
  ChecklistData,
  ContentDataType,
  StepSettings,
  ClientContext,
  contentStartReason,
} from '@usertour/types';
import { isUndefined } from '@usertour/helpers';
import { Server, Socket } from 'socket.io';
import { ConditionTrackingService } from '@/web-socket/core/condition-tracking.service';
import { ConditionTimerService } from '@/web-socket/core/condition-timer.service';
import { SocketDataService } from '@/web-socket/core/socket-data.service';
import { SocketClientData } from '@/common/types/content';
import { EventTrackingService } from '@/web-socket/core/event-tracking.service';
import { ContentManagerService } from '@/web-socket/core/content-manager.service';
import { ClientCondition } from '@/common/types/sdk';

@Injectable()
export class WebSocketV2Service {
  private readonly logger = new Logger(WebSocketV2Service.name);
  constructor(
    private prisma: PrismaService,
    private bizService: BizService,
    private eventTrackingService: EventTrackingService,
    private readonly contentManagerService: ContentManagerService,
    private readonly conditionTrackingService: ConditionTrackingService,
    private readonly conditionTimerService: ConditionTimerService,
    private readonly socketDataService: SocketDataService,
  ) {}

  /**
   * Upsert business users
   * @param data - The data to upsert
   * @returns The upserted business users
   */
  async upsertBizUsers(
    socket: Socket,
    socketClientData: SocketClientData,
    data: UpsertUserDto,
  ): Promise<boolean> {
    const { externalUserId, attributes } = data;
    if (!socketClientData?.environment) return false;

    const bizUser = await this.bizService.upsertBizUsers(
      this.prisma,
      externalUserId,
      attributes,
      socketClientData.environment.id,
    );
    if (!bizUser) return false;
    return await this.socketDataService.updateClientData(socket.id, { externalUserId });
  }

  /**
   * Upsert business companies
   * @param socket - The socket instance
   * @param data - The data to upsert
   * @returns The upserted business companies
   */
  async upsertBizCompanies(
    socket: Socket,
    socketClientData: SocketClientData,
    data: UpsertCompanyDto,
  ): Promise<boolean> {
    const { externalCompanyId, externalUserId, attributes, membership } = data;
    if (!socketClientData?.environment) return false;

    const bizCompany = await this.bizService.upsertBizCompanies(
      this.prisma,
      externalCompanyId,
      externalUserId,
      attributes,
      socketClientData.environment.id,
      membership,
    );

    if (!bizCompany) return false;
    return await this.socketDataService.updateClientData(socket.id, { externalCompanyId });
  }

  /**
   * Update socket context
   * @param socket - The socket instance
   * @param clientContext - The socket context
   * @returns True if the socket context was updated successfully
   */
  async updateClientContext(socket: Socket, clientContext: ClientContext): Promise<boolean> {
    return await this.socketDataService.updateClientData(socket.id, { clientContext });
  }

  /**
   * Track event
   * @param socket - The socket instance
   * @param trackEventDto - The track event DTO
   * @returns True if the event was tracked successfully
   */
  async trackEvent(
    socketClientData: SocketClientData,
    trackEventDto: TrackEventDto,
  ): Promise<boolean> {
    const { environment, externalUserId, clientContext } = socketClientData;
    if (!environment || !externalUserId) return false;
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
    if (!token) return null;
    return await this.prisma.environment.findFirst({ where: { token } });
  }

  /**
   * Go to step
   * @param socketClientData - The socket socket data
   * @param params - The parameters for the go to step event
   * @returns True if the event was tracked successfully
   */
  async goToStep(socketClientData: SocketClientData, params: GoToStepDto): Promise<boolean> {
    if (!socketClientData?.environment) return false;
    const { environment, clientContext } = socketClientData;
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: params.sessionId },
      include: { bizUser: true, version: { include: { steps: true } } },
    });
    if (!bizSession) return false;
    const version = bizSession.version;
    const step = version.steps.find((s) => s.id === params.stepId);
    if (!step) return false;
    const stepIndex = version.steps.findIndex((s) => s.id === step.id);
    if (stepIndex === -1) return false;

    const total = version.steps.length;
    const progress = Math.round(((stepIndex + 1) / total) * 100);

    const isExplicitCompletionStep = (step.setting as StepSettings).explicitCompletionStep;
    const isComplete = isExplicitCompletionStep
      ? isExplicitCompletionStep
      : stepIndex + 1 === total;

    const eventData = {
      [EventAttributes.FLOW_VERSION_ID]: version.id,
      [EventAttributes.FLOW_VERSION_NUMBER]: version.sequence,
      [EventAttributes.FLOW_STEP_NUMBER]: stepIndex,
      [EventAttributes.FLOW_STEP_CVID]: step.cvid,
      [EventAttributes.FLOW_STEP_NAME]: step.name,
      [EventAttributes.FLOW_STEP_PROGRESS]: Math.round(progress),
    };

    const externalUserId = String(bizSession.bizUser.externalId);

    await this.eventTrackingService.trackEvent(
      environment,
      externalUserId,
      BizEvents.FLOW_STEP_SEEN,
      bizSession.id,
      eventData,
      clientContext,
    );

    if (isComplete) {
      await this.eventTrackingService.trackEvent(
        environment,
        externalUserId,
        BizEvents.FLOW_COMPLETED,
        bizSession.id,
        eventData,
        clientContext,
      );
    }

    return true;
  }

  /**
   * Answer question
   * @param socketClientData - The socket socket data
   * @param params - The parameters for the answer question event
   * @returns True if the event was tracked successfully
   */
  async answerQuestion(
    socketClientData: SocketClientData,
    params: AnswerQuestionDto,
  ): Promise<boolean> {
    const { environment, clientContext } = socketClientData;
    if (!environment) return false;
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
   * @param socketClientData - The socket socket data
   * @param params - The parameters for the click checklist task event
   * @returns True if the event was tracked successfully
   */
  async clickChecklistTask(
    socketClientData: SocketClientData,
    params: ClickChecklistTaskDto,
  ): Promise<boolean> {
    const { environment, clientContext } = socketClientData;
    if (!environment) return false;
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: params.sessionId },
      include: { bizUser: true, content: true, version: { include: { steps: true } } },
    });
    if (!bizSession) return false;
    const content = bizSession.content;
    const version = bizSession.version;
    const step = version.steps.find((s) =>
      (s.data as unknown as ChecklistData)?.items?.find((item) => item.id === params.taskId),
    );
    if (!step) return false;
    const checklistData = step.data as unknown as ChecklistData;
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
   * @param socketClientData - The socket socket data
   * @param params - The parameters for the hide checklist event
   * @returns True if the event was tracked successfully
   */
  async hideChecklist(
    socketClientData: SocketClientData,
    params: HideChecklistDto,
  ): Promise<boolean> {
    const { environment, clientContext } = socketClientData;
    if (!environment) return false;
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
  async showChecklist(
    socketClientData: SocketClientData,
    params: ShowChecklistDto,
  ): Promise<boolean> {
    const { environment, clientContext } = socketClientData;
    if (!environment) return false;
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
   * @param socketClientData - The socket socket data
   * @param params - The parameters for the tooltip target missing event
   * @returns True if the event was tracked successfully
   */
  async reportTooltipTargetMissing(
    server: Server,
    socket: Socket,
    socketClientData: SocketClientData,
    params: TooltipTargetMissingDto,
  ): Promise<boolean> {
    const { environment, clientContext } = socketClientData;
    if (!environment) return false;
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

    return await this.contentManagerService.cancelContent(server, socket, sessionId);
  }

  /**
   * End batch
   * @param server - The server instance
   * @param socket - The socket instance
   * @returns True if the batch was ended successfully
   */
  async endBatch(
    server: Server,
    socket: Socket,
    socketClientData: SocketClientData,
  ): Promise<boolean> {
    return await this.toggleContents(server, socket, socketClientData);
  }

  /**
   * Start content
   * @param server - The server instance
   * @param socket - The socket instance
   * @param startContentDto - The parameters for the start content event
   * @returns True if the content was started successfully
   */
  async startContent(
    server: Server,
    socket: Socket,
    socketClientData: SocketClientData,
    startContentDto: StartContentDto,
  ): Promise<boolean> {
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
    if (!socketClientData) return false;
    // Start the content
    return await this.contentManagerService.startContent({
      server,
      socket,
      contentType,
      socketClientData,
      options: startContentDto,
    });
  }

  /**
   * End content
   * @param socket - The socket instance
   * @param endContentDto - The end content DTO
   * @returns True if the event was tracked successfully
   */
  async endContent(
    server: Server,
    socket: Socket,
    socketClientData: SocketClientData,
    endContentDto: EndContentDto,
  ): Promise<boolean> {
    const { sessionId, reason } = endContentDto;
    const { externalUserId, environment, clientContext } = socketClientData;
    if (!externalUserId || !environment) return false;
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { content: true },
    });
    if (!bizSession) return false;
    const contentType = bizSession.content.type as ContentDataType;
    if (contentType !== ContentDataType.FLOW) {
      return false;
    }
    // Track flow ended event
    await this.eventTrackingService.trackFlowEndedEvent(
      bizSession,
      environment,
      externalUserId,
      reason,
      clientContext,
    );
    await this.contentManagerService.cancelContent(server, socket, sessionId);
    return true;
  }

  /**
   * Toggle contents for the socket
   * This method will start FLOW and CHECKLIST content, handling session cleanup and restart
   * @param server - The server instance
   * @param socket - The socket instance
   * @param socketClientData - Optional socket client data, will be fetched if not provided
   * @returns True if the contents were toggled successfully
   */
  async toggleContents(
    server: Server,
    socket: Socket,
    socketClientData?: SocketClientData,
  ): Promise<boolean> {
    // If socketClientData is not provided, fetch it using getClientData
    const clientData = socketClientData ?? (await this.socketDataService.getClientData(socket.id));

    if (!clientData) return false;

    await this.contentManagerService.startContent({
      server,
      socket,
      contentType: ContentDataType.FLOW,
      socketClientData: clientData,
      options: {
        startReason: contentStartReason.START_FROM_CONDITION,
      },
    });
    return true;
  }

  /**
   * Toggle the isActive status of a specific socket condition by condition ID
   * @param socket - The socket instance
   * @param socketClientData - The socket client data
   * @param clientCondition - The client condition
   * @returns True if the condition was toggled successfully
   */
  async toggleClientCondition(
    socket: Socket,
    socketClientData: SocketClientData,
    clientCondition: ClientCondition,
  ): Promise<boolean> {
    const { conditionId, isActive } = clientCondition;
    const { clientConditions } = socketClientData;
    return await this.conditionTrackingService.toggleClientCondition(
      socket,
      clientConditions,
      conditionId,
      isActive,
    );
  }

  /**
   * Fire condition wait timer
   * @param socket - The socket instance
   * @param socketClientData - The socket client data
   * @param fireConditionWaitTimerDto - The DTO containing the version ID
   * @returns True if the wait timer was fired successfully
   */
  async fireConditionWaitTimer(
    socket: Socket,
    socketClientData: SocketClientData,
    fireConditionWaitTimerDto: FireConditionWaitTimerDto,
  ): Promise<boolean> {
    const { versionId } = fireConditionWaitTimerDto;
    return await this.conditionTimerService.fireConditionWaitTimer(
      socket,
      socketClientData.conditionWaitTimers,
      versionId,
    );
  }
}
