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
  TrackTrackerEventDto,
  OpenResourceCenterDto,
  CloseResourceCenterDto,
  ClickResourceCenterDto,
  ListResourceCenterBlockContentDto,
  ResourceCenterBlockContentItem,
  ResourceCenterBlock,
  ResourceCenterBlockType,
  ContentDataType,
  ClientContext,
  contentEndReason,
  AnswerQuestionDto,
  BizEvents,
  ClientCondition,
  CustomContentSession,
  ListAnnouncementsResult,
  GetAnnouncementDto,
  AnnouncementDetail,
  AnnouncementSeenSource,
  MarkAnnouncementsSeenDto,
  AnnouncementListItem,
  AnnouncementData,
} from '@usertour/types';
import { ANNOUNCEMENT_SEEN_SOURCES } from '@usertour/constants';
import { WebSocketContext } from './web-socket-v2.dto';
import { Socket, Server } from 'socket.io';
import { SocketDataService } from '../core/socket-data.service';
import { ContentCancelContext, ContentStartContext, SocketData } from '@/common/types/content';
import { EventTrackingService } from '@/web-socket/core/event-tracking.service';
import { ContentOrchestratorService } from '@/web-socket/core/content-orchestrator.service';
import { AnnouncementService } from '@/web-socket/core/announcement.service';
import { ContentDataService } from '@/web-socket/core/content-data.service';
import { BizUser } from '@/common/types/schema';
import { ProjectCacheService } from '@/shared/project-cache.service';
import { buildExternalUserRoomId, getSocketId } from '@/utils/websocket-utils';
import { assignClientContext, buildAnnouncementSeenEventData } from '@/utils/event-v2';
import { humanize } from '@usertour/helpers';

@Injectable()
export class WebSocketV2Service {
  private readonly logger = new Logger(WebSocketV2Service.name);

  constructor(
    private prisma: PrismaService,
    private bizService: BizService,
    private eventTrackingService: EventTrackingService,
    private readonly contentOrchestratorService: ContentOrchestratorService,
    private readonly announcementService: AnnouncementService,
    private readonly contentDataService: ContentDataService,
    private readonly socketDataService: SocketDataService,
    private readonly cache: ProjectCacheService,
  ) {}

  // ============================================================================
  // Socket Data Management Methods
  // ============================================================================

  /**
   * Get socket data from Redis, memoized per request scope so the
   * 8+ orchestrator reads in one EndBatch coalesce into a single Redis GET.
   * SocketDataService.set/delete invalidate the memo so post-write reads
   * return the new state.
   */
  async getSocketData(socket: Socket): Promise<SocketData | null> {
    return this.cache.memoize(this.cache.memoKeys.socketData(getSocketId(socket)), () =>
      this.socketDataService.get(socket),
    );
  }

  /**
   * Update socket data in Redis
   * @param socket - The socket instance
   * @param updates - Partial data to update
   * @returns Promise<boolean>
   */
  private async updateSocketData(socket: Socket, updates: Partial<SocketData>): Promise<boolean> {
    return await this.socketDataService.set(socket, updates, true);
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
   * Creates the user if it doesn't exist (ensures bizUserId is always set on successful connection)
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
    const environmentId = environment.id;

    // Ensure user exists - guarantees bizUserId is always set on successful connection
    // ensureBizUser will throw if creation fails, caught by gateway's try-catch
    const bizUser = await this.bizService.ensureBizUser(externalUserId, environmentId);

    const bizCompany = externalCompanyId
      ? await this.bizService.getBizCompany(externalCompanyId, environmentId)
      : null;

    // Build base socket data
    const socketData: SocketData = {
      environment,
      externalUserId,
      clientContext,
      externalCompanyId,
      waitTimers: [],
      clientConditions,
      bizUserId: bizUser.id,
      bizCompanyId: bizCompany?.id,
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
    const {
      flowSessionId,
      checklistSessionId,
      bannerSessionId,
      resourceCenterSessionId,
      launchers = [],
    } = auth;

    // Initialize sessions in parallel (singleton sessions and launchers can be initialized concurrently)
    const [flowSession, checklistSession, bannerSession, resourceCenterSession, launcherSessions] =
      await Promise.all([
        flowSessionId
          ? this.initializeSessionById(socketData, flowSessionId)
          : Promise.resolve(null),
        checklistSessionId
          ? this.initializeSessionById(socketData, checklistSessionId)
          : Promise.resolve(null),
        bannerSessionId
          ? this.initializeSessionById(socketData, bannerSessionId)
          : Promise.resolve(null),
        resourceCenterSessionId
          ? this.initializeSessionById(socketData, resourceCenterSessionId)
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
    if (bannerSession) {
      socketData.bannerSession = bannerSession;
    }
    if (resourceCenterSession) {
      socketData.resourceCenterSession = resourceCenterSession;
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

    const { externalUserId, attributes = {} } = data;

    // The WS handshake authenticates a specific externalUserId; subsequent
    // writes must target that same user. Trusting the payload's
    // externalUserId allows a misbehaving client (or a stale message buffered
    // before the connection was reauthed as a different user) to cross
    // identities, leaking the previous user's writes onto the current
    // session's socketData.
    if (externalUserId !== socketData.externalUserId) {
      this.logger.warn(
        `[WS] UpsertUser payload externalUserId=${externalUserId} does not match socket auth ${socketData.externalUserId}; rejecting`,
      );
      return false;
    }

    const bizUser = await this.bizService.upsertBizUsers(
      this.prisma,
      externalUserId,
      attributes,
      environment.id,
    );
    if (!bizUser) {
      await this.socketDataService.delete(socket);
      this.logger.error(`Failed to upsert business user ${externalUserId} for socket ${socket.id}`);
      return false;
    }
    return await this.updateSocketData(socket, { externalUserId, bizUserId: bizUser.id });
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

    const { externalCompanyId, externalUserId, attributes = {}, membership = {} } = data;

    // Same identity guard as upsertBizUsers: the user the connection is
    // authenticated as is the only user this socket can write for. The
    // company id may legitimately switch via group(), so it is not validated
    // here.
    if (externalUserId !== socketData.externalUserId) {
      this.logger.warn(
        `[WS] UpsertCompany payload externalUserId=${externalUserId} does not match socket auth ${socketData.externalUserId}; rejecting`,
      );
      return false;
    }

    const bizCompany = await this.bizService.upsertBizCompanies(
      this.prisma,
      externalCompanyId,
      externalUserId,
      attributes,
      environment.id,
      membership,
    );

    if (!bizCompany) {
      await this.socketDataService.delete(socket);
      this.logger.error(
        `Failed to upsert business company ${externalCompanyId} for socket ${socket.id}`,
      );
      return false;
    }
    return await this.updateSocketData(socket, { externalCompanyId, bizCompanyId: bizCompany.id });
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
      return await this.contentOrchestratorService.startContentBatch(startContentContext);
    }
    // Start the content
    const success = await this.contentOrchestratorService.startContent(startContentContext);
    await this.contentOrchestratorService.toggleContents(context);
    return success;
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

    // Handle checklist completed events before dismiss
    // Some state must be updated before dismiss since session info cannot be updated after
    await this.contentOrchestratorService.handleChecklistCompletedEvents(socket);

    const success = await this.contentOrchestratorService.cancelContent({
      server,
      socket,
      sessionId,
      unsetCurrentSession: false,
      cancelOtherSessions: true,
      endReason,
    });
    await this.contentOrchestratorService.toggleContents(context);
    return success;
  }

  /**
   * End all content
   * @param context - The web socket context
   * @returns True if the all content was ended successfully
   */
  async endAllContent(context: WebSocketContext): Promise<boolean> {
    const { server, socket, socketData } = context;
    const {
      flowSession,
      checklistSession,
      bannerSession,
      resourceCenterSession,
      launcherSessions = [],
    } = socketData;

    // Collect all sessions to cancel
    const sessionsToCancel: CustomContentSession[] = [];
    if (flowSession) {
      sessionsToCancel.push(flowSession);
    }
    if (checklistSession) {
      sessionsToCancel.push(checklistSession);
    }
    if (bannerSession) {
      sessionsToCancel.push(bannerSession);
    }
    if (resourceCenterSession) {
      sessionsToCancel.push(resourceCenterSession);
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

    // Cancel all sessions (cancelContent now supports all content types)
    await Promise.allSettled(
      sessionsToCancel
        .filter((session) => session.id != null)
        .map((session) => {
          const context: ContentCancelContext = {
            ...endContentContext,
            sessionId: session.id!,
          };
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
    return await this.contentOrchestratorService.toggleContents(context);
  }

  // ============================================================================
  // Event Tracking Methods
  // ============================================================================

  /**
   * Track event
   * Auto-creates Event and Attributes if they don't exist.
   * @param context - The web socket context
   * @param trackEventDto - The track event DTO
   * @returns True if the event was tracked successfully
   */
  async trackEvent(context: WebSocketContext, trackEventDto: TrackEventDto): Promise<boolean> {
    const { socketData } = context;
    const { environment, bizUserId, bizCompanyId, clientContext } = socketData;
    const { projectId } = environment;

    const { name, attributes, userOnly } = trackEventDto;

    const success = await this.prisma.$transaction(async (tx) => {
      // 1. Find or create Event by codeName + projectId
      let event = await tx.event.findFirst({
        where: { codeName: name, projectId },
      });

      if (!event) {
        event = await tx.event.create({
          data: {
            codeName: name,
            displayName: humanize(name),
            description: '',
            predefined: false,
            projectId,
          },
        });
      }

      // 2. Resolve attributes + link them to this Event (handled by BizService,
      //    which also takes care of invalidating the project's Attribute cache
      //    when a new row was auto-created).
      const mergedAttributes = assignClientContext(attributes ?? {}, clientContext);
      const eventData = await this.bizService.resolveAndLinkEventAttributes(
        tx,
        projectId,
        event.id,
        mergedAttributes,
      );

      // 3. Create BizEvent
      await tx.bizEvent.create({
        data: {
          bizUserId,
          eventId: event.id,
          data: Object.keys(eventData).length > 0 ? eventData : undefined,
          bizSessionId: null,
          contentId: null,
          versionId: null,
          bizCompanyId: userOnly === true ? null : (bizCompanyId ?? null),
        },
      });

      return true;
    });

    if (!success) {
      return false;
    }

    await this.contentOrchestratorService.toggleContents(context);
    return true;
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
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    const success = await this.eventTrackingService.trackEventByType(BizEvents.QUESTION_ANSWERED, {
      sessionId: params.sessionId,
      environment,
      clientContext,
      answer: params,
    });
    await this.contentOrchestratorService.toggleContents(context, [ContentDataType.FLOW]);

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
    // Use cancelContent which now supports all content types including LAUNCHER
    return await this.contentOrchestratorService.cancelContent(dismissLauncherContext);
  }

  /**
   * Track a tracker event
   * Tracker does not use BizSession — directly writes BizEvent with contentId/versionId.
   * @param context - The web socket context
   * @param params - The tracker event parameters (contentId, versionId)
   * @returns True if the event was tracked successfully
   */
  async trackTrackerEvent(
    context: WebSocketContext,
    params: TrackTrackerEventDto,
  ): Promise<boolean> {
    const { socketData } = context;
    const { environment, externalUserId, clientContext, bizCompanyId } = socketData;
    return await this.eventTrackingService.trackTrackerEvent({
      environment,
      externalUserId,
      clientContext,
      contentId: params.contentId,
      versionId: params.versionId,
      bizCompanyId,
    });
  }

  // ============================================================================
  // Resource Center Methods
  // ============================================================================

  /**
   * Open resource center (panel expanded)
   */
  async openResourceCenter(
    context: WebSocketContext,
    params: OpenResourceCenterDto,
  ): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackEventByType(BizEvents.RESOURCE_CENTER_OPENED, {
      sessionId: params.sessionId,
      environment,
      clientContext,
    });
  }

  /**
   * Close resource center (panel collapsed)
   */
  async closeResourceCenter(
    context: WebSocketContext,
    params: CloseResourceCenterDto,
  ): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackEventByType(BizEvents.RESOURCE_CENTER_CLOSED, {
      sessionId: params.sessionId,
      environment,
      clientContext,
    });
  }

  /**
   * Click resource center block
   */
  async clickResourceCenter(
    context: WebSocketContext,
    params: ClickResourceCenterDto,
  ): Promise<boolean> {
    const { socketData } = context;
    const { environment, clientContext } = socketData;
    return await this.eventTrackingService.trackEventByType(BizEvents.RESOURCE_CENTER_CLICKED, {
      sessionId: params.sessionId,
      environment,
      clientContext,
      blockId: params.blockId,
    });
  }

  /**
   * List resource center block content items (flows/checklists)
   * Returns content names and types for the given block
   */
  async listResourceCenterBlockContent(
    context: WebSocketContext,
    params: ListResourceCenterBlockContentDto,
  ): Promise<ResourceCenterBlockContentItem[]> {
    const { socketData } = context;
    const resourceCenterSession = socketData.resourceCenterSession;
    if (!resourceCenterSession) {
      this.logger.warn('No resource center session found');
      return [];
    }

    const resourceCenterData = resourceCenterSession.version?.resourceCenter;
    if (!resourceCenterData) {
      return [];
    }

    let block: ResourceCenterBlock | undefined;
    for (const tab of resourceCenterData.tabs) {
      block = tab.blocks.find(
        (b) => b.id === params.blockId && b.type === ResourceCenterBlockType.CONTENT_LIST,
      );
      if (block) break;
    }
    if (!block || block.type !== ResourceCenterBlockType.CONTENT_LIST) {
      return [];
    }

    const contentItems = block.contentItems;
    if (!contentItems || contentItems.length === 0) {
      return [];
    }

    const contentIds = contentItems.map((item) => item.contentId);
    const environmentId = socketData.environment.id;

    // Query contents that are published in the current environment
    const publishedContents = await this.prisma.contentOnEnvironment.findMany({
      where: {
        contentId: { in: contentIds },
        environmentId,
        published: true,
      },
      select: {
        contentId: true,
        content: { select: { id: true, name: true, type: true, deleted: true } },
      },
    });

    const contentNameMap = new Map(
      publishedContents
        .filter((c) => !c.content.deleted)
        .map((c) => [c.contentId, c.content.name || '']),
    );

    return contentItems
      .filter((item) => contentNameMap.has(item.contentId))
      .map((item) => ({
        contentId: item.contentId,
        contentType: item.contentType,
        name: contentNameMap.get(item.contentId) || '',
        ...(item.iconSource && { iconSource: item.iconSource }),
        ...(item.iconType && { iconType: item.iconType }),
        ...(item.iconUrl && { iconUrl: item.iconUrl }),
        ...(item.navigateUrl && { navigateUrl: item.navigateUrl }),
        ...(item.navigateOpenType && { navigateOpenType: item.navigateOpenType }),
      }));
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
      const launcherSession = await this.contentOrchestratorService.initializeSessionByContentId(
        socketData,
        launcherId,
        ContentDataType.LAUNCHER,
      );
      if (launcherSession) {
        launcherSessions.push(launcherSession);
      }
    }
    return launcherSessions;
  }

  /**
   * Cancel all active content sessions for a specific content when it's unpublished
   * @param server - The WebSocket server instance
   * @param contentId - The content ID to cancel sessions for
   * @param environmentId - The environment ID
   * @returns Promise<void>
   */
  async cancelAllContentSessions(
    server: Server,
    contentId: string,
    environmentId: string,
  ): Promise<void> {
    try {
      // Find all active sessions (state = 0) for this content
      const activeSessions = await this.prisma.bizSession.findMany({
        where: {
          contentId,
          environmentId,
          state: 0, // Active sessions
          deleted: false,
        },
        include: {
          bizUser: {
            select: {
              externalId: true,
            },
          },
        },
      });

      if (activeSessions.length === 0) {
        this.logger.debug(
          `No active sessions found for content ${contentId} in environment ${environmentId}`,
        );
        return;
      }

      // Collect all cancel contexts first
      const cancelContexts: ContentCancelContext[] = [];

      for (const session of activeSessions) {
        const { id: sessionId, bizUser } = session;

        if (!bizUser?.externalId) {
          continue;
        }

        // Build user room ID to find the socket
        const userRoomId = buildExternalUserRoomId(environmentId, bizUser.externalId);
        const sockets = await server.in(userRoomId).fetchSockets();

        if (sockets.length === 0) {
          continue;
        }

        // Cancel the session on all sockets in the user room
        const socket = sockets[0] as unknown as Socket;

        cancelContexts.push({
          server,
          socket,
          sessionId,
          cancelOtherSessions: true,
          unsetCurrentSession: true,
          endReason: contentEndReason.UNPUBLISHED_CONTENT,
        });
      }

      // Cancel all sessions
      await Promise.allSettled(
        cancelContexts.map((cancelContext) => {
          return this.contentOrchestratorService.cancelContent(cancelContext).catch((error) => {
            this.logger.error(
              `Failed to cancel session ${cancelContext.sessionId} for socket ${cancelContext.socket.id}: ${error.message}`,
            );
          });
        }),
      );

      this.logger.log(
        `Canceled all active sessions for content ${contentId} in environment ${environmentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cancel all content sessions for content ${contentId}: ${(error as Error).message}`,
      );
    }
  }

  // ============================================================================
  // Announcement Methods
  // ============================================================================

  /**
   * List the announcements visible to the current user, newest first.
   *
   * The feed is a single server-capped page (AnnouncementService.SCAN_LIMIT) —
   * the contract carries no pagination. Each candidate is gated by its "Only
   * show if..." targeting rules (config.autoStartRules) using the same
   * DB-backed evaluation as resource-center block visibility — a targeted
   * announcement is never leaked to users who don't match.
   */
  async listAnnouncements(context: WebSocketContext): Promise<ListAnnouncementsResult> {
    const { socketData } = context;

    const bizUser = await this.findBizUser(socketData);
    if (!bizUser) {
      return { announcements: [] };
    }

    // Newest N candidates that pass the user's "Only show if..." targeting
    // (findVisibleAnnouncements defaults to AnnouncementService.SCAN_LIMIT).
    const visibleItems = await this.announcementService.findVisibleAnnouncements(
      socketData.environment,
      bizUser,
      socketData.externalCompanyId,
      socketData.clientContext?.locale,
    );

    // Seen status and the intro-content attributes are independent (different
    // tables), so resolve them in parallel to save a round-trip on feed open.
    // Attributes: the feed's intro content isn't part of the RC session, so the
    // widget has no values for it otherwise.
    const contentIds = visibleItems.map((item) => item.contentId);
    const [seenSet, attributes] = await Promise.all([
      this.announcementService.getSeenAnnouncementIds(bizUser.id, contentIds),
      this.announcementService.resolveContentAttributes(
        visibleItems.map(
          (item) => (item.publishedVersion.data as AnnouncementData | null)?.introContent,
        ),
        socketData.environment,
        socketData.externalUserId,
        socketData.externalCompanyId,
      ),
    ]);

    const announcements: AnnouncementListItem[] = visibleItems.map((item) => ({
      ...this.announcementService.buildItemBase(item.content, item.publishedVersion),
      seen: seenSet.has(item.contentId),
    }));

    return { announcements, attributes };
  }

  /**
   * Get a single announcement with full detail content.
   */
  async getAnnouncement(
    context: WebSocketContext,
    params: GetAnnouncementDto,
  ): Promise<AnnouncementDetail | null> {
    const { socketData } = context;
    const bizUser = await this.findBizUser(socketData);

    // Same candidate query + "Only show if..." targeting gate the feed uses, so
    // a direct by-id fetch can't expose an announcement the feed would hide.
    const visible = await this.announcementService.findVisibleAnnouncementById(
      params.contentId,
      socketData.environment,
      bizUser,
      socketData.externalCompanyId,
      socketData.clientContext?.locale,
    );
    if (!visible) {
      return null;
    }

    const data = (visible.publishedVersion.data ?? {}) as unknown as AnnouncementData;

    // Resolve the attributes referenced in the intro + detail content — the
    // announcement isn't part of the RC session, so the widget can't otherwise
    // interpolate them.
    const attributes = await this.announcementService.resolveContentAttributes(
      [data.introContent, data.detailContent],
      socketData.environment,
      socketData.externalUserId,
      socketData.externalCompanyId,
    );

    return {
      ...this.announcementService.buildItemBase(visible.content, visible.publishedVersion),
      moreContent: data.enableReadMore ? (data.detailContent ?? null) : null,
      attributes,
    };
  }

  /**
   * Mark the given announcements as seen — one batch per feed open. The seen
   * state lands in the BizAnnouncementSeen read-state table; the idempotent
   * insert (unique (bizUserId, contentId) key) makes concurrent marks — a feed
   * refetch, a second tab — safe without locking, and only the ids that were
   * newly inserted get an ANNOUNCEMENT_SEEN analytics event, so views are never
   * double-counted.
   */
  async markAnnouncementsSeen(
    context: WebSocketContext,
    params: MarkAnnouncementsSeenDto,
  ): Promise<boolean> {
    const { socketData } = context;

    try {
      const { environment, externalUserId, clientContext, bizCompanyId } = socketData;

      // The feed never returns more than SCAN_LIMIT rows, so a legit client
      // never sends more; cap here so a hostile payload can't inflate the
      // candidate query.
      const contentIds = (params.items ?? [])
        .slice(0, AnnouncementService.SCAN_LIMIT)
        .map((item) => item.contentId);
      if (contentIds.length === 0) {
        return true;
      }

      const bizUser = await this.findBizUser(socketData);
      if (!bizUser) {
        return false;
      }

      // Returns first-seen announcements with their authoritative published
      // versionId. Gated only by the candidate gate (a published announcement in
      // this env) — NOT by mark-time targeting: a dismiss must persist even after
      // the user's attributes drift out of the rule (see markAnnouncementsSeen).
      const firstSeen = await this.announcementService.markAnnouncementsSeen(
        environment,
        bizUser,
        contentIds,
      );
      if (firstSeen.length === 0) {
        return true;
      }

      // The surface that marked them, recorded on the analytics event.
      // Whitelisted rather than passed through, so a client can't invent
      // arbitrary source values.
      const source: AnnouncementSeenSource = ANNOUNCEMENT_SEEN_SOURCES.includes(
        params.source as AnnouncementSeenSource,
      )
        ? (params.source as AnnouncementSeenSource)
        : 'resource_center';

      // Fire the analytics trail only for first-seen announcements, with the
      // server-derived versionId (never the client's).
      await Promise.all(
        firstSeen.map(({ contentId, versionId }) =>
          this.eventTrackingService.trackDirectContentEvent({
            environment,
            externalUserId,
            clientContext,
            contentId,
            versionId,
            eventCodeName: BizEvents.ANNOUNCEMENT_SEEN,
            buildEventData: (content, version) =>
              buildAnnouncementSeenEventData(content, version, source),
            bizCompanyId,
          }),
        ),
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to mark announcements seen: ${(error as Error).message}`);
      return false;
    }
  }

  // ============================================================================
  // Announcement Helper Methods
  // ============================================================================

  private async findBizUser(socketData: SocketData): Promise<BizUser | null> {
    // Single shared, request-memoized lookup — so the feed's bizUser and the
    // attribute-resolution one coalesce into one query per request.
    return this.contentDataService.findBizUser(socketData.environment, socketData.externalUserId);
  }
}
