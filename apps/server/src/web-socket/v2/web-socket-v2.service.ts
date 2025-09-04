import { BizService } from '@/biz/biz.service';
import { Injectable, Logger } from '@nestjs/common';
import { Environment, BizSession } from '@/common/types/schema';
import { PrismaService } from 'nestjs-prisma';
import {
  UpsertUserDto,
  UpsertCompanyDto,
  TrackEventDto,
  GoToStepDto,
  AnswerQuestionDto,
  ClickChecklistTaskDto,
  HideChecklistDto,
  ShowChecklistDto,
  TooltipTargetMissingDto,
  ToggleClientConditionDto,
} from './web-socket-v2.dto';
import {
  EventAttributes,
  BizEvents,
  ChecklistData,
  ContentDataType,
  StepSettings,
  RulesType,
  EndFlowDto,
  ClientContext,
  StartFlowDto,
} from '@usertour/types';
import {
  findAvailableSessionId,
  evaluateCustomContentVersion,
  ConditionExtractionMode,
  filterActivatedContentWithoutClientConditions,
  findLatestActivatedCustomContentVersion,
  filterAvailableAutoStartContentVersions,
  isActivedHideRules,
  extractClientTrackConditions,
} from '@/utils/content-utils';
import { SDKContentSession, StartContentOptions, TrackCondition } from '@/common/types/sdk';
import { RedisService } from '@/shared/redis.service';
import { CustomContentVersion } from '@/common/types/content';
import { isUndefined } from '@usertour/helpers';
import { deepmerge } from 'deepmerge-ts';
import { Server, Socket } from 'socket.io';
import {
  getClientData,
  getExternalUserRoom,
  setChecklistSession,
  setClientData,
  setFlowSession,
  trackClientEvent,
  unsetChecklistSession,
  unsetFlowSession,
  untrackClientEvent,
} from '@/utils/ws-utils';
import { TrackEventService } from '@/web-socket/core/track-event.service';
import { ContentManagementService } from '@/web-socket/core/content-management.service';
import { ContentSessionService } from '@/web-socket/core/content-session.service';

type UserClientContext = {
  externalUserId: string;
  externalCompanyId: string;
  clientContext: ClientContext;
};

@Injectable()
export class WebSocketV2Service {
  private readonly logger = new Logger(WebSocketV2Service.name);
  constructor(
    private prisma: PrismaService,
    private bizService: BizService,
    private trackEventService: TrackEventService,
    private contentManagementService: ContentManagementService,
    private contentSessionService: ContentSessionService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Upsert business users
   * @param data - The data to upsert
   * @returns The upserted business users
   */
  async upsertBizUsers(client: Socket, data: UpsertUserDto): Promise<boolean> {
    const { userId: externalUserId, attributes } = data;
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
    const { companyId: externalCompanyId, userId: externalUserId, attributes, membership } = data;
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
   * Create a biz session
   * @param client - The client instance
   * @param externalUserId - The external user ID
   * @param externalCompanyId - The external company ID
   * @param versionId - The version ID
   * @param reason - The reason for creating the session
   * @returns The created session
   */
  async createBizSession(
    client: Socket,
    externalUserId: string,
    externalCompanyId: string,
    versionId: string,
    reason?: string,
  ): Promise<BizSession | null> {
    const { environment } = getClientData(client);
    const environmentId = environment.id;
    const bizUser = await this.prisma.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId },
    });
    const bizCompany = await this.prisma.bizCompany.findFirst({
      where: { externalId: String(externalCompanyId), environmentId },
    });
    if (!bizUser || (externalCompanyId && !bizCompany)) {
      return null;
    }

    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
      include: {
        content: true,
      },
    });

    if (!version) {
      return null;
    }

    const content = version.content;

    const session = await this.prisma.bizSession.create({
      data: {
        state: 0,
        progress: 0,
        projectId: environment.projectId,
        environmentId: environment.id,
        bizUserId: bizUser.id,
        contentId: content.id,
        versionId,
        bizCompanyId: externalCompanyId ? bizCompany.id : null,
      },
    });

    // If the content is a flow or checklist, create a start event
    if (content.type === ContentDataType.FLOW || content.type === ContentDataType.CHECKLIST) {
      // Always create start event when session is created
      const startReason = reason || 'auto_start';
      const eventName =
        content.type === ContentDataType.FLOW
          ? BizEvents.FLOW_STARTED
          : BizEvents.CHECKLIST_STARTED;

      const eventData =
        content.type === ContentDataType.FLOW
          ? {
              [EventAttributes.FLOW_START_REASON]: startReason,
              [EventAttributes.FLOW_VERSION_ID]: version.id,
              [EventAttributes.FLOW_VERSION_NUMBER]: version.sequence,
            }
          : {
              [EventAttributes.CHECKLIST_ID]: content.id,
              [EventAttributes.CHECKLIST_NAME]: content.name,
              [EventAttributes.CHECKLIST_START_REASON]: startReason,
              [EventAttributes.CHECKLIST_VERSION_ID]: version.id,
              [EventAttributes.CHECKLIST_VERSION_NUMBER]: version.sequence,
            };

      await this.trackEventV2(client, {
        userId: externalUserId,
        eventName,
        sessionId: session.id,
        eventData,
      });
    }

    return session;
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
   * Track event v2
   * @param client - The client instance
   * @param data - The event data
   * @returns True if the event was tracked successfully
   */
  async trackEventV2(client: Socket, data: TrackEventDto): Promise<boolean> {
    const { environment } = getClientData(client);
    const userClientContext = await this.getUserClientContext(client, data.userId);
    const clientContext = userClientContext?.clientContext;
    const clientContextData = clientContext
      ? {
          [EventAttributes.PAGE_URL]: clientContext.pageUrl,
          [EventAttributes.VIEWPORT_WIDTH]: clientContext.viewportWidth,
          [EventAttributes.VIEWPORT_HEIGHT]: clientContext.viewportHeight,
        }
      : {};
    const newData = userClientContext
      ? {
          ...data,
          eventData: {
            ...clientContextData,
            ...data.eventData,
          },
        }
      : data;
    await this.trackEventService.trackEvent(environment, newData);
    return true;
  }

  /**
   * Update user client context
   * @param client - The client instance
   * @param clientContext - The client context
   */
  async setUserClientContext(client: Socket, clientContext: ClientContext): Promise<boolean> {
    const { environment, externalUserId, externalCompanyId } = getClientData(client);
    const key = `user_context:${environment.id}:${externalUserId}`;
    await this.redisService.setex(
      key,
      60 * 60 * 24,
      JSON.stringify({ externalUserId, externalCompanyId, clientContext }),
    );
    return true;
  }

  /**
   * Get user client context
   * @param client - The client instance
   * @param externalUserId - The external user ID
   * @returns The user client context or null if not found
   */
  async getUserClientContext(
    client: Socket,
    externalUserId: string,
  ): Promise<UserClientContext | null> {
    const { environment } = getClientData(client);
    const key = `user_context:${environment.id}:${externalUserId}`;
    const value = await this.redisService.get(key);
    if (!value) return null;
    return JSON.parse(value) as UserClientContext;
  }

  /**
   * Find activated custom content version by evaluated
   * @param client - The client instance
   * @param contentTypes - The content types
   * @returns The activated custom content versions
   */
  async findActivatedCustomContentVersionByEvaluated(
    client: Socket,
    contentTypes: ContentDataType[],
    versionId?: string,
  ): Promise<CustomContentVersion[]> {
    const { environment, trackConditions, externalUserId, externalCompanyId } =
      getClientData(client);
    const userClientContext = await this.getUserClientContext(client, externalUserId);
    const clientContext = userClientContext?.clientContext;
    const activatedIds = trackConditions
      ?.filter((trackCondition: TrackCondition) => trackCondition.condition.actived)
      .map((trackCondition: TrackCondition) => trackCondition.condition.id);
    const deactivatedIds = trackConditions
      ?.filter((trackCondition: TrackCondition) => !trackCondition.condition.actived)
      .map((trackCondition: TrackCondition) => trackCondition.condition.id);

    const contentVersions = await this.contentManagementService.fetchCustomContentVersions(
      environment,
      externalUserId,
      externalCompanyId,
      versionId,
    );
    const filteredContentVersions = contentVersions.filter((contentVersion) =>
      contentTypes.includes(contentVersion.content.type as ContentDataType),
    );

    return await evaluateCustomContentVersion(filteredContentVersions, {
      typeControl: {
        [RulesType.CURRENT_PAGE]: true,
        [RulesType.TIME]: true,
      },
      clientContext,
      activatedIds,
      deactivatedIds,
    });
  }

  /**
   * End flow
   * @param client - The client instance
   * @param endFlowDto - The end flow DTO
   * @returns True if the event was tracked successfully
   */
  async endFlow(server: Server, client: Socket, endFlowDto: EndFlowDto): Promise<boolean> {
    const { sessionId, reason } = endFlowDto;
    const { externalUserId } = getClientData(client);
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
    });
    if (!bizSession) return false;
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
      [EventAttributes.FLOW_END_REASON]: reason,
    });

    await this.trackEventV2(client, {
      userId: String(externalUserId),
      eventName: BizEvents.FLOW_ENDED,
      sessionId: bizSession.id,
      eventData,
    });

    // Unset current flow session
    this.unsetSessionData(client, ContentDataType.FLOW);
    // Toggle contents for the client
    await this.toggleContents(server, client);
    return true;
  }

  /**
   * Go to step
   * @param client - The client instance
   * @param params - The parameters for the go to step event
   * @returns True if the event was tracked successfully
   */
  async goToStep(client: Socket, params: GoToStepDto): Promise<boolean> {
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

    await this.trackEventV2(client, {
      userId: String(bizSession.bizUser.externalId),
      eventName: BizEvents.FLOW_STEP_SEEN,
      sessionId: bizSession.id,
      eventData,
    });

    if (isComplete) {
      await this.trackEventV2(client, {
        userId: String(bizSession.bizUser.externalId),
        eventName: BizEvents.FLOW_COMPLETED,
        sessionId: bizSession.id,
        eventData,
      });
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

    await this.trackEventV2(client, {
      userId: String(bizSession.bizUser.externalId),
      eventName: BizEvents.QUESTION_ANSWERED,
      sessionId: bizSession.id,
      eventData,
    });
    return true;
  }

  /**
   * Click checklist task
   * @param client - The client instance
   * @param params - The parameters for the click checklist task event
   * @returns True if the event was tracked successfully
   */
  async clickChecklistTask(client: Socket, params: ClickChecklistTaskDto): Promise<boolean> {
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

    await this.trackEventV2(client, {
      userId: String(bizSession.bizUser.externalId),
      eventName: BizEvents.CHECKLIST_TASK_CLICKED,
      sessionId: bizSession.id,
      eventData,
    });

    return true;
  }

  /**
   * Update client context
   * @param server - The server instance
   * @param client - The client instance
   * @param clientContext - The client context
   * @returns True if the client context was updated successfully
   */
  async updateClientContext(
    server: Server,
    client: Socket,
    clientContext: ClientContext,
  ): Promise<boolean> {
    await this.setUserClientContext(client, clientContext);
    await this.toggleContents(server, client);
    return true;
  }

  /**
   * Hide checklist
   * @param client - The client instance
   * @param params - The parameters for the hide checklist event
   * @returns True if the event was tracked successfully
   */
  async hideChecklist(client: Socket, params: HideChecklistDto): Promise<boolean> {
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

    await this.trackEventV2(client, {
      userId: String(bizSession.bizUser.externalId),
      eventName: BizEvents.CHECKLIST_HIDDEN,
      sessionId: bizSession.id,
      eventData,
    });

    return true;
  }

  /**
   * Show checklist
   * @param client - The client instance
   * @param params - The parameters for the show checklist event
   * @returns True if the event was tracked successfully
   */
  async showChecklist(client: Socket, params: ShowChecklistDto): Promise<boolean> {
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

    await this.trackEventV2(client, {
      userId: String(bizSession.bizUser.externalId),
      eventName: BizEvents.CHECKLIST_SEEN,
      sessionId: bizSession.id,
      eventData,
    });

    return true;
  }

  /**
   * Report tooltip target missing
   * @param client - The client instance
   * @param params - The parameters for the tooltip target missing event
   * @returns True if the event was tracked successfully
   */
  async reportTooltipTargetMissing(
    client: Socket,
    params: TooltipTargetMissingDto,
  ): Promise<boolean> {
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

    await this.trackEventV2(client, {
      userId: String(bizSession.bizUser.externalId),
      eventName: BizEvents.TOOLTIP_TARGET_MISSING,
      sessionId: bizSession.id,
      eventData,
    });

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
   * Start flow
   * @param server - The server instance
   * @param client - The client instance
   * @param startFlowDto - The parameters for the start flow event
   * @returns True if the flow was started successfully
   */
  async startFlow(server: Server, client: Socket, startFlowDto: StartFlowDto): Promise<boolean> {
    return await this.startSingletonContent(server, client, ContentDataType.FLOW, startFlowDto);
  }

  /**
   * Toggle contents for the client
   * This method will start FLOW and CHECKLIST content, handling session cleanup and restart
   * @param server - The server instance
   * @param client - The client instance
   * @returns True if the contents were toggled successfully
   */
  async toggleContents(server: Server, client: Socket): Promise<boolean> {
    await this.startSingletonContent(server, client, ContentDataType.FLOW);
    // await this.startSingletonContent(server, client, ContentDataType.CHECKLIST);
    return true;
  }

  /**
   * Start singleton content instance for the client
   * @param server - The server instance
   * @param client - The client instance
   * @param contentType - The content type
   * @param options - The options for starting content
   */
  async startSingletonContent(
    server: Server,
    client: Socket,
    contentType: ContentDataType,
    options?: StartContentOptions,
  ): Promise<boolean> {
    const { contentId } = options ?? {};

    // Strategy 1: Try to start by specific contentId
    if (contentId) {
      const started = await this.tryStartByContentId(server, client, contentType, options);
      if (started) return true;
    }

    // Handle existing session
    const session = this.getContentSession(client, contentType);
    if (session) {
      const isActive = await this.isSessionActive(client, contentType, session);
      if (isActive) {
        return true;
      }

      // Cleanup invalid session
      this.unsetContentSession(server, client, contentType, session.id);
      this.untrackCurrentTrackConditions(server, client);
    }

    const evaluatedContentVersions = await this.findActivatedCustomContentVersionByEvaluated(
      client,
      [contentType],
    );

    // Strategy 2: Try to start by latest activated content version
    const isLatestActivatedContentVersionStarted =
      await this.tryStartByLatestActivatedContentVersion(
        server,
        client,
        evaluatedContentVersions,
        contentType,
        options,
      );

    if (isLatestActivatedContentVersionStarted) {
      return true;
    }

    // Strategy 3: Try to start by auto start conditions
    const isAutoStartByConditions = await this.tryStartByAutoStartConditions(
      server,
      client,
      evaluatedContentVersions,
      contentType,
      options,
    );

    if (isAutoStartByConditions) {
      return true;
    }

    const trackCustomContentVersions: CustomContentVersion[] =
      filterActivatedContentWithoutClientConditions(evaluatedContentVersions, contentType);

    const trackConditions = extractClientTrackConditions(
      trackCustomContentVersions,
      ConditionExtractionMode.BOTH,
    );

    if (trackConditions.length > 0) {
      this.trackClientConditions(server, client, trackConditions);
    }

    return true;
  }

  /**
   * Check if the existing session is still active
   * @param client - The client instance
   * @param contentType - The content type
   * @param session - The existing session to validate
   * @returns True if the session is still active
   */
  private async isSessionActive(
    client: Socket,
    contentType: ContentDataType,
    session: SDKContentSession,
  ): Promise<boolean> {
    const sessionVersion = await this.findActivatedCustomContentVersionByEvaluated(
      client,
      [contentType],
      session.version.id,
    );

    return sessionVersion && !isActivedHideRules(sessionVersion[0]);
  }

  /**
   * Try to start content by content ID
   * @param server - The server instance
   * @param client - The client instance
   * @param contentType - The content type
   * @param options - The options for starting content
   * @returns True if the content was started successfully
   */
  private async tryStartByContentId(
    server: Server,
    client: Socket,
    contentType: ContentDataType,
    options: StartContentOptions,
  ): Promise<boolean> {
    const { contentId } = options;
    const { environment } = getClientData(client);
    // Get all published versions with content
    const contentOnEnvironment = await this.prisma.contentOnEnvironment.findFirst({
      where: {
        environmentId: environment.id,
        contentId: contentId,
        published: true,
      },
    });
    if (!contentOnEnvironment) {
      return false;
    }
    const evaluatedContentVersions = await this.findActivatedCustomContentVersionByEvaluated(
      client,
      [contentType],
      contentOnEnvironment.publishedVersionId,
    );

    if (evaluatedContentVersions.length > 0) {
      const started = await this.processContentVersion(
        server,
        client,
        evaluatedContentVersions[0],
        options,
        true,
      );
      if (started) return true;
    }
    return false;
  }

  /**
   * Try to start content by latest activated content version
   * @param server - The server instance
   * @param client - The client instance
   * @param evaluatedContentVersions - The evaluated content versions
   * @param contentType - The content type
   * @param options - The options for starting content
   * @returns True if the content was started successfully
   */
  private async tryStartByLatestActivatedContentVersion(
    server: Server,
    client: Socket,
    evaluatedContentVersions: CustomContentVersion[],
    contentType: ContentDataType,
    options?: StartContentOptions,
  ): Promise<boolean> {
    const latestActivatedContentVersion = findLatestActivatedCustomContentVersion(
      evaluatedContentVersions,
      contentType as ContentDataType.CHECKLIST | ContentDataType.FLOW,
    );

    if (latestActivatedContentVersion) {
      const started = await this.processContentVersion(
        server,
        client,
        latestActivatedContentVersion,
        options,
        false,
      );
      if (started) return true;
    }
    return false;
  }

  /**
   * Try to start content by auto start conditions
   * @param server - The server instance
   * @param client - The client instance
   * @param evaluatedContentVersions - The evaluated content versions
   * @param contentType - The content type
   * @param options - The options for starting content
   * @returns True if the content was started successfully
   */
  private async tryStartByAutoStartConditions(
    server: Server,
    client: Socket,
    evaluatedContentVersions: CustomContentVersion[],
    contentType: ContentDataType,
    options?: StartContentOptions,
  ): Promise<boolean> {
    const autoStartContentVersion = filterAvailableAutoStartContentVersions(
      evaluatedContentVersions,
      contentType as ContentDataType.CHECKLIST | ContentDataType.FLOW,
    )?.[0];

    if (autoStartContentVersion) {
      return await this.processContentVersion(
        server,
        client,
        autoStartContentVersion,
        options,
        true,
      );
    }

    return false;
  }

  /**
   * Process content version with common logic
   * @param server - The server instance
   * @param client - The client instance
   * @param customContentVersion - The custom content version
   * @param options - The options for starting content
   * @param createNewSession - Whether to create a new session
   * @returns True if the content version was processed successfully
   */
  private async processContentVersion(
    server: Server,
    client: Socket,
    customContentVersion: CustomContentVersion,
    options?: StartContentOptions,
    createNewSession = false,
  ): Promise<boolean> {
    // Check if hide rules are active early
    if (isActivedHideRules(customContentVersion)) {
      return false;
    }

    const { stepIndex } = options ?? {};
    const { environment, externalUserId, externalCompanyId } = getClientData(client);
    const contentType = customContentVersion.content.type as ContentDataType;
    const versionId = customContentVersion.id;

    let sessionId: string;

    if (createNewSession) {
      const newSession = await this.createBizSession(
        client,
        externalUserId,
        externalCompanyId,
        versionId,
        'auto_start',
      );

      if (!newSession) {
        return false;
      }

      sessionId = newSession.id;
    } else {
      // Find existing session
      const session = customContentVersion.session;
      sessionId = findAvailableSessionId(session.latestSession, contentType);

      if (!sessionId) {
        return false;
      }
    }

    // Create SDK content session
    const contentSession = await this.contentSessionService.createContentSession(
      sessionId,
      customContentVersion,
      environment,
      externalUserId,
      contentType,
      externalCompanyId,
      stepIndex,
    );

    if (!contentSession) {
      return false;
    }

    this.setContentSession(server, client, contentSession);

    await this.prisma.bizSession.update({
      where: { id: sessionId },
      data: { versionId },
    });

    const clientTrackConditions = extractClientTrackConditions(
      [customContentVersion],
      ConditionExtractionMode.HIDE_ONLY,
    );

    const excludeConditionIds = clientTrackConditions?.map(
      (trackCondition) => trackCondition.condition.id,
    );
    this.untrackCurrentTrackConditions(server, client, excludeConditionIds);

    if (clientTrackConditions.length > 0) {
      this.trackClientConditions(server, client, clientTrackConditions);
    }

    return true;
  }

  /**
   * Track the client conditions for the given content types
   * @param server - The server instance
   * @param client - The client instance
   * @param conditions - The conditions to track
   */
  trackClientConditions(server: Server, client: Socket, trackConditions: TrackCondition[]) {
    const { environment, externalUserId } = getClientData(client);

    const room = getExternalUserRoom(environment.id, externalUserId);
    const { trackConditions: existingConditions } = getClientData(client);

    // Update new conditions with existing isActive values
    const conditions: TrackCondition[] = trackConditions.map((trackCondition: TrackCondition) => {
      const existingCondition = existingConditions?.find(
        (existing: TrackCondition) => existing.condition.id === trackCondition.condition.id,
      );

      if (existingCondition) {
        return {
          ...trackCondition,
          condition: {
            ...trackCondition.condition,
            actived: existingCondition.condition.actived,
          },
        };
      }

      return {
        ...trackCondition,
        condition: {
          ...trackCondition.condition,
          actived: false,
        },
      };
    });

    const newConditions = conditions.filter(
      (condition) =>
        !existingConditions?.some(
          (existing: TrackCondition) => existing.condition.id === condition.condition.id,
        ),
    );

    const emitTrackConditions: TrackCondition[] = [];
    for (const condition of newConditions) {
      const emitted = trackClientEvent(server, room, condition);
      if (emitted) {
        emitTrackConditions.push(condition);
      }
    }

    setClientData(client, { trackConditions: emitTrackConditions });
  }

  /**
   * Toggle the isActive status of a specific client condition by condition ID
   * @param server - The server instance
   * @param client - The client instance
   * @param toggleClientConditionDto - The DTO containing condition ID and active status
   * @returns True if the condition was toggled successfully
   */
  async toggleClientCondition(
    server: Server,
    client: Socket,
    toggleClientConditionDto: ToggleClientConditionDto,
  ): Promise<boolean> {
    const { conditionId, isActive } = toggleClientConditionDto;
    const { externalUserId, trackConditions: existingConditions } = getClientData(client);

    // Check if condition exists
    const conditionExists = existingConditions?.some(
      (condition: TrackCondition) => condition.condition.id === conditionId,
    );

    if (!conditionExists) {
      this.logger.warn(`Condition with ID ${conditionId} not found for user ${externalUserId}`);
      return false;
    }

    // Update existing conditions with the new active status
    const conditions = existingConditions?.map((trackCondition: TrackCondition) => {
      if (trackCondition.condition.id === conditionId) {
        return {
          ...trackCondition,
          condition: {
            ...trackCondition.condition,
            actived: isActive,
          },
        };
      }
      return trackCondition;
    });

    // Update client data
    setClientData(client, { trackConditions: conditions });

    // Start content if the condition is active
    await this.toggleContents(server, client);

    return true;
  }

  /**
   * Un-track the client conditions for the given content types
   * @param server - The server instance
   * @param client - The client instance
   */
  untrackCurrentTrackConditions(server: Server, client: Socket, excludeConditionIds?: string[]) {
    const { trackConditions } = getClientData(client);
    if (!trackConditions) return;
    const filteredTrackConditions = trackConditions?.filter(
      (trackCondition) => !excludeConditionIds?.includes(trackCondition.condition.id),
    );
    this.untrackTrackConditions(server, client, filteredTrackConditions);
  }

  /**
   * Un-track the client conditions for the given content types
   * @param server - The server instance
   * @param client - The client instance
   * @param trackConditions - The conditions to un-track
   */
  untrackTrackConditions(server: Server, client: Socket, untrackConditions: TrackCondition[]) {
    const { trackConditions, environment, externalUserId } = getClientData(client);
    const room = getExternalUserRoom(environment.id, externalUserId);

    const conditionIdsToRemove: string[] = [];

    for (const untrackCondition of untrackConditions) {
      const emitted = untrackClientEvent(server, room, untrackCondition.condition.id);

      if (emitted) {
        conditionIdsToRemove.push(untrackCondition.condition.id);
      }
    }

    // Remove successfully emitted conditions from trackConditions
    if (conditionIdsToRemove.length > 0 && trackConditions) {
      setClientData(client, {
        trackConditions: trackConditions.filter(
          (condition: TrackCondition) => !conditionIdsToRemove.includes(condition.condition.id),
        ),
      });
    }
  }

  /**
   * Set the content session for the client
   * @param server - The server instance
   * @param client - The client instance
   * @param session - The session to set
   */
  setContentSession(server: Server, client: Socket, session: SDKContentSession) {
    const { environment, externalUserId } = getClientData(client);
    const room = getExternalUserRoom(environment.id, externalUserId);
    const contentType = session.content.type as ContentDataType;
    if (contentType === ContentDataType.FLOW) {
      setClientData(client, { flowSession: session });
      setFlowSession(server, room, session);
    } else if (contentType === ContentDataType.CHECKLIST) {
      setClientData(client, { checklistSession: session });
      setChecklistSession(server, room, session);
    }
  }

  /**
   * Get the content session for the client
   * @param client - The client instance
   * @param contentType - The content type
   * @returns The content session
   */
  getContentSession(client: Socket, contentType: ContentDataType): SDKContentSession | null {
    if (contentType === ContentDataType.FLOW) {
      return getClientData(client).flowSession;
    }
    if (contentType === ContentDataType.CHECKLIST) {
      return getClientData(client).checklistSession;
    }
    return null;
  }

  /**
   * Unset the content session for the client
   * @param server - The server instance
   * @param client - The client instance
   * @param contentType - The content type to unset
   * @param sessionId - The ID of the session to unset
   */
  unsetContentSession(
    server: Server,
    client: Socket,
    contentType: ContentDataType,
    sessionId: string,
  ) {
    const { environment, externalUserId } = getClientData(client);

    const room = getExternalUserRoom(environment.id, externalUserId);
    if (contentType === ContentDataType.FLOW) {
      unsetFlowSession(server, room, sessionId);
    } else if (contentType === ContentDataType.CHECKLIST) {
      unsetChecklistSession(server, room, sessionId);
    }
    this.unsetSessionData(client, contentType);
  }

  /**
   * Unset the session data for the client
   * @param client - The client instance
   * @param contentType - The content type to unset
   */
  unsetSessionData(client: Socket, contentType: ContentDataType): boolean {
    if (contentType === ContentDataType.FLOW) {
      setClientData(client, { flowSession: undefined });
    } else if (contentType === ContentDataType.CHECKLIST) {
      setClientData(client, { checklistSession: undefined });
    }
    return true;
  }
}
