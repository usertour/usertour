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
  ToggleClientConditionDto,
  TrackEventDto,
  StartContentDto,
  EndContentDto,
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
import {
  unsetSessionData,
  toggleClientCondition,
  getClientData,
  setClientData,
  untrackCurrentConditions,
} from '@/web-socket/core/socket-helper';
import { TrackEventService } from '@/web-socket/core/track-event.service';
import { UserClientContextService } from '@/web-socket/core/user-client-context.service';
import { ContentStartService } from '@/web-socket/core/content-start.service';

@Injectable()
export class WebSocketV2Service {
  private readonly logger = new Logger(WebSocketV2Service.name);
  constructor(
    private prisma: PrismaService,
    private bizService: BizService,
    private trackEventService: TrackEventService,
    private readonly userClientContextService: UserClientContextService,
    private readonly contentStartService: ContentStartService,
  ) {}

  /**
   * Upsert business users
   * @param data - The data to upsert
   * @returns The upserted business users
   */
  async upsertBizUsers(client: Socket, data: UpsertUserDto): Promise<boolean> {
    const { externalUserId, attributes } = data;
    const { environment } = getClientData(client);
    await this.bizService.upsertBizUsers(this.prisma, externalUserId, attributes, environment.id);
    setClientData(client, { externalUserId });
    return true;
  }

  /**
   * Upsert business companies
   * @param client - The client instance
   * @param data - The data to upsert
   * @returns The upserted business companies
   */
  async upsertBizCompanies(client: Socket, data: UpsertCompanyDto): Promise<boolean> {
    const { externalCompanyId, externalUserId, attributes, membership } = data;
    const { environment } = getClientData(client);
    await this.bizService.upsertBizCompanies(
      this.prisma,
      externalCompanyId,
      externalUserId,
      attributes,
      environment.id,
      membership,
    );

    setClientData(client, { externalCompanyId });
    return true;
  }

  /**
   * Update client context
   * @param client - The client instance
   * @param clientContext - The client context
   * @returns True if the client context was updated successfully
   */
  async updateClientContext(client: Socket, clientContext: ClientContext): Promise<boolean> {
    await this.setUserClientContext(client, clientContext);
    return true;
  }

  /**
   * Update user client context
   * @param client - The client instance
   * @param clientContext - The client context
   */
  async setUserClientContext(client: Socket, clientContext: ClientContext): Promise<boolean> {
    const { environment, externalUserId, externalCompanyId } = getClientData(client);
    return await this.userClientContextService.setUserClientContext(
      environment,
      externalUserId,
      externalCompanyId,
      clientContext,
    );
  }

  /**
   * Track event
   * @param client - The client instance
   * @param trackEventDto - The track event DTO
   * @returns True if the event was tracked successfully
   */
  async trackEvent(client: Socket, trackEventDto: TrackEventDto): Promise<boolean> {
    const { environment, externalUserId } = getClientData(client);
    const { eventName, sessionId, eventData } = trackEventDto;
    return Boolean(
      await this.trackEventService.trackEvent(
        environment,
        externalUserId,
        eventName,
        sessionId,
        eventData,
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
   * @param client - The client instance
   * @param params - The parameters for the go to step event
   * @returns True if the event was tracked successfully
   */
  async goToStep(client: Socket, params: GoToStepDto): Promise<boolean> {
    const { environment } = getClientData(client);
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

    await this.trackEventService.trackEvent(
      environment,
      externalUserId,
      BizEvents.FLOW_STEP_SEEN,
      bizSession.id,
      eventData,
    );

    if (isComplete) {
      await this.trackEventService.trackEvent(
        environment,
        externalUserId,
        BizEvents.FLOW_COMPLETED,
        bizSession.id,
        eventData,
      );
    }

    return true;
  }

  /**
   * Answer question
   * @param client - The client instance
   * @param params - The parameters for the answer question event
   * @returns True if the event was tracked successfully
   */
  async answerQuestion(client: Socket, params: AnswerQuestionDto): Promise<boolean> {
    const { environment } = getClientData(client);
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
      await this.trackEventService.trackEvent(
        environment,
        externalUserId,
        BizEvents.QUESTION_ANSWERED,
        bizSession.id,
        eventData,
      ),
    );
  }

  /**
   * Click checklist task
   * @param client - The client instance
   * @param params - The parameters for the click checklist task event
   * @returns True if the event was tracked successfully
   */
  async clickChecklistTask(client: Socket, params: ClickChecklistTaskDto): Promise<boolean> {
    const { environment } = getClientData(client);
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
      await this.trackEventService.trackEvent(
        environment,
        externalUserId,
        BizEvents.CHECKLIST_TASK_CLICKED,
        bizSession.id,
        eventData,
      ),
    );
  }

  /**
   * Hide checklist
   * @param client - The client instance
   * @param params - The parameters for the hide checklist event
   * @returns True if the event was tracked successfully
   */
  async hideChecklist(client: Socket, params: HideChecklistDto): Promise<boolean> {
    const { environment } = getClientData(client);
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
      await this.trackEventService.trackEvent(
        environment,
        externalUserId,
        BizEvents.CHECKLIST_HIDDEN,
        bizSession.id,
        eventData,
      ),
    );
  }

  /**
   * Show checklist
   * @param client - The client instance
   * @param params - The parameters for the show checklist event
   * @returns True if the event was tracked successfully
   */
  async showChecklist(client: Socket, params: ShowChecklistDto): Promise<boolean> {
    const { environment } = getClientData(client);
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
      await this.trackEventService.trackEvent(
        environment,
        externalUserId,
        BizEvents.CHECKLIST_SEEN,
        bizSession.id,
        eventData,
      ),
    );
  }

  /**
   * Report tooltip target missing
   * @param client - The client instance
   * @param params - The parameters for the tooltip target missing event
   * @returns True if the event was tracked successfully
   */
  async reportTooltipTargetMissing(
    server: Server,
    client: Socket,
    params: TooltipTargetMissingDto,
  ): Promise<boolean> {
    const { environment } = getClientData(client);
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
    await this.trackEventService.trackEvent(
      environment,
      externalUserId,
      BizEvents.TOOLTIP_TARGET_MISSING,
      bizSession.id,
      eventData,
    );
    // Untrack current conditions
    untrackCurrentConditions(server, client);
    // Unset current flow session
    unsetSessionData(client, ContentDataType.FLOW);
    // Toggle contents for the client
    await this.toggleContents(server, client);

    return true;
  }

  /**
   * End batch
   * @param server - The server instance
   * @param client - The client instance
   * @returns True if the batch was ended successfully
   */
  async endBatch(server: Server, client: Socket): Promise<boolean> {
    return await this.toggleContents(server, client);
  }

  /**
   * Start content
   * @param server - The server instance
   * @param client - The client instance
   * @param startContentDto - The parameters for the start content event
   * @returns True if the content was started successfully
   */
  async startContent(
    server: Server,
    client: Socket,
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
    // Start the content
    return await this.contentStartService.startSingletonContent({
      server,
      client,
      contentType,
      options: startContentDto,
    });
  }

  /**
   * End content
   * @param client - The client instance
   * @param endContentDto - The end content DTO
   * @returns True if the event was tracked successfully
   */
  async endContent(server: Server, client: Socket, endContentDto: EndContentDto): Promise<boolean> {
    const { sessionId, reason } = endContentDto;
    const { externalUserId, environment } = getClientData(client);
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { content: true },
    });
    if (!bizSession) return false;
    const contentType = bizSession.content.type as ContentDataType;
    if (contentType !== ContentDataType.FLOW) {
      return false;
    }
    await this.trackEventService.trackFlowEndedEvent(
      bizSession,
      environment,
      externalUserId,
      reason,
    );
    // Untrack current conditions
    untrackCurrentConditions(server, client);
    // Unset current flow session
    unsetSessionData(client, ContentDataType.FLOW);
    // Toggle contents for the client
    await this.toggleContents(server, client);
    return true;
  }

  /**
   * Toggle contents for the client
   * This method will start FLOW and CHECKLIST content, handling session cleanup and restart
   * @param server - The server instance
   * @param client - The client instance
   * @returns True if the contents were toggled successfully
   */
  async toggleContents(server: Server, client: Socket): Promise<boolean> {
    await this.contentStartService.startSingletonContent({
      server,
      client,
      contentType: ContentDataType.FLOW,
      options: {
        startReason: contentStartReason.START_FROM_CONDITION,
      },
    });
    return true;
  }

  /**
   * Toggle the isActive status of a specific client condition by condition ID
   * @param client - The client instance
   * @param toggleClientConditionDto - The DTO containing condition ID and active status
   * @returns True if the condition was toggled successfully
   */
  async toggleClientCondition(
    client: Socket,
    toggleClientConditionDto: ToggleClientConditionDto,
  ): Promise<boolean> {
    const { conditionId, isActive } = toggleClientConditionDto;

    return toggleClientCondition(client, conditionId, isActive);
  }
}
