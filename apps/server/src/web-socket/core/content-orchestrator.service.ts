import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ContentDataType, contentStartReason, RulesType } from '@usertour/types';
import {
  filterActivatedContentWithoutClientConditions,
  findLatestActivatedCustomContentVersions,
  filterAvailableAutoStartContentVersions,
  isActivedHideRules,
  extractClientTrackConditions,
  evaluateCustomContentVersion,
  findAvailableSessionId,
  extractClientConditionWaitTimers,
  sessionIsAvailable,
  extractChecklistNewCompletedItems,
  extractChecklistTrackConditions,
  hasContentSessionChanges,
  filterAvailableLauncherContentVersions,
  findCurrentStepCvid,
} from '@/utils/content-utils';
import {
  buildExternalUserRoomId,
  extractContentTypeBySessionId,
  extractExcludedContentIds,
  extractSessionByContentType,
  buildSocketLockKey,
} from '@/utils/websocket-utils';
import {
  StartContentOptions,
  CustomContentSession,
  ClientCondition,
  SocketData,
  CustomContentVersion,
  ContentStartContext,
  ContentCancelContext,
  CancelSessionParams,
  ActivateSessionParams,
  ContentStartResult,
  ConditionExtractionMode,
  Environment,
  TryAutoStartContentOptions,
} from '@/common/types';
import { DistributedLockService } from './distributed-lock.service';
import { DataResolverService } from './data-resolver.service';
import { SessionBuilderService } from './session-builder.service';
import { EventTrackingService } from './event-tracking.service';
import { SocketOperationService } from './socket-operation.service';
import { SocketDataService } from './socket-data.service';

/**
 * Result of launcher data preparation
 */
interface LauncherDataPreparationResult {
  success: boolean;
  availableVersions: CustomContentVersion[];
  shouldTrackVersions: CustomContentVersion[];
  startReason: contentStartReason;
  versionId?: string;
}

/**
 * Service responsible for managing content (flows, checklists) with various strategies
 */
@Injectable()
export class ContentOrchestratorService {
  private readonly logger = new Logger(ContentOrchestratorService.name);

  constructor(
    private readonly dataResolverService: DataResolverService,
    private readonly sessionBuilderService: SessionBuilderService,
    private readonly eventTrackingService: EventTrackingService,
    private readonly socketOperationService: SocketOperationService,
    private readonly socketDataService: SocketDataService,
    private readonly distributedLockService: DistributedLockService,
  ) {}

  /**
   * Get socket data from Redis
   * @param socket - The socket instance
   * @returns Promise<SocketData | null>
   */
  private async getSocketData(socket: Socket): Promise<SocketData | null> {
    return await this.socketDataService.get(socket.id);
  }

  /**
   * Main entry point for starting singleton content
   * Implements multiple strategies for content activation and coordinates the start process
   * No longer needs distributed lock as message queue ensures ordered execution
   */
  async startContent(context: ContentStartContext): Promise<boolean> {
    const { options } = context;
    const contentId = options?.contentId;
    // Strategy 1: Try to start by specific contentId
    if (contentId) {
      const result = await this.tryStartByContentId(context);
      return await this.handleContentStartResult(context, { ...result, forceGoToStep: true });
    }

    // Strategy 2: Handle existing session
    const existingSessionResult = await this.handleExistingSession(context);
    if (existingSessionResult.success) {
      return await this.handleContentStartResult(context, existingSessionResult);
    }

    // Strategy 3: Try to auto start content
    const strategyResult = await this.tryAutoStartContent(context);
    return await this.handleContentStartResult(context, {
      ...strategyResult,
      isActivateOtherSockets: true,
    });
  }

  /**
   * Cancel content
   * No longer needs distributed lock as message queue ensures ordered execution
   * @param context - The content cancel context
   * @returns True if the content was canceled successfully
   */
  async cancelContent(context: ContentCancelContext): Promise<boolean> {
    const {
      server,
      socket,
      sessionId,
      cancelOtherSessions = true,
      unsetCurrentSession = false,
      endReason,
    } = context;

    const socketData = await this.getSocketData(socket);
    if (!socketData) {
      return false;
    }
    const { environment, externalUserId, clientContext } = socketData;

    // Track content ended event
    const isEventTracked = await this.eventTrackingService.trackContentEndedEvent(
      sessionId,
      environment,
      externalUserId,
      clientContext,
      endReason,
    );

    if (!isEventTracked) {
      return false;
    }

    const roomId = buildExternalUserRoomId(environment.id, externalUserId);

    // Define common cancel session parameters
    const cancelSessionParams: CancelSessionParams = {
      server,
      socket,
      socketData,
      sessionId,
      setLastDismissedId: true,
    };

    // Cleanup socket session
    await this.cancelSocketSession({ ...cancelSessionParams, unsetSession: unsetCurrentSession });
    // Cleanup other sockets in room
    if (cancelOtherSessions) {
      await this.cancelOtherSocketSessionsInRoom(roomId, cancelSessionParams);
    }
    return true;
  }

  /**
   * Cancel current socket session
   * @param params - The cancel session parameters
   * @returns True if the session was canceled successfully
   */
  private async cancelSocketSession(params: CancelSessionParams) {
    const { server, socket, sessionId, socketData } = params;
    const contentType = extractContentTypeBySessionId(socketData, sessionId);
    const currentSession = extractSessionByContentType(socketData, contentType);
    const context = {
      server,
      socket,
      socketData,
      contentType,
      options: {
        startReason: contentStartReason.START_FROM_CONDITION,
      },
    };
    // If the current session is not the same as the session id, return false
    if (currentSession && currentSession.id !== sessionId) {
      return false;
    }
    const excludeContentIds = [currentSession?.content?.id].filter(Boolean) as string[];

    // First attempt: Try to auto start content excluding current session's content
    const excludedResult = await this.tryAutoStartContent(context, {
      excludeContentIds,
      allowWaitTimers: false,
      fallback: false,
    });
    // Only handle if there's a session to activate
    if (excludedResult.session) {
      return await this.handleContentStartResult(context, {
        ...excludedResult,
        isActivateOtherSockets: false,
      });
    }

    // Second attempt: Try to auto start content with all available content
    const result = await this.tryAutoStartContent(context);
    // Cleanup current session if exists
    if (currentSession && !result.session) {
      if (!(await this.cleanupSocketSession(currentSession, params))) {
        return false;
      }
      const newSocketData = await this.getSocketData(socket);
      if (!newSocketData) {
        return false;
      }
      context.socketData = newSocketData;
    }

    // handleContentStartResult will check success internally
    return await this.handleContentStartResult(context, {
      ...result,
      isActivateOtherSockets: false,
    });
  }

  /**
   * Cleanup socket session
   * @param session - The session to cleanup
   * @param params - The cleanup session parameters
   * @returns Promise<boolean> - True if the session was cleaned up successfully
   */
  private async cleanupSocketSession(
    session: CustomContentSession | null,
    params: CancelSessionParams,
  ): Promise<boolean> {
    const { socket, socketData, unsetSession = true, setLastDismissedId = false } = params;

    return await this.socketOperationService.cleanupSocketSession(socket, socketData, session, {
      unsetSession,
      setLastDismissedId,
    });
  }

  /**
   * Cancel other socket session
   * @param params - The cancel session parameters
   * @returns True if the session was canceled successfully
   */
  private async cancelOtherSocketSession(params: CancelSessionParams) {
    const { socket } = params;
    const lockKey = buildSocketLockKey(socket.id);

    return (
      (await this.distributedLockService.withRetryLock(
        lockKey,
        async () => {
          const socketData = await this.getSocketData(socket);
          if (!socketData) {
            return false;
          }
          return await this.cancelSocketSession({
            ...params,
            socketData,
          });
        },
        3, // Retry 3 times
        100, // Retry interval 100ms
        5000, // Lock timeout 5 seconds
      )) ?? false
    );
  }

  /**
   * Cancel other socket sessions in room
   * @param roomId - The room id
   * @param params - The cancel session parameters
   * @returns True if the sessions were canceled successfully
   */
  private async cancelOtherSocketSessionsInRoom(roomId: string, params: CancelSessionParams) {
    const { server, socket: currentSocket } = params;
    try {
      const sockets = await server.in(roomId).fetchSockets();
      if (sockets.length === 0) {
        return false;
      }

      const stopPromises = sockets
        .filter((socket) => socket.id !== currentSocket.id)
        .map((socket) =>
          this.cancelOtherSocketSession({
            ...params,
            socket: socket as unknown as Socket,
          }),
        );

      await Promise.allSettled(stopPromises);

      return true;
    } catch (error) {
      this.logger.error(`Failed to stop other sockets in room: ${error.message}`);
      return false;
    }
  }

  /**
   * Activate current socket session
   * @param params - The activate session parameters
   * @returns True if the session was activated successfully
   */
  private async activateSocketSession(params: ActivateSessionParams) {
    const { socketData, session, forceGoToStep } = params;
    if (!socketData || !session) {
      return false;
    }
    const contentType = session.content.type as ContentDataType;
    const currentSession = extractSessionByContentType(socketData, contentType);
    const isNotChanged = currentSession && !hasContentSessionChanges(currentSession, session);
    if (isNotChanged) {
      this.logger.debug(`Session is not changed, session: ${session.id}`);
      return true;
    }
    if (contentType === ContentDataType.FLOW) {
      if (forceGoToStep && session.currentStep?.id) {
        await this.sessionBuilderService.updateCurrentStepId(session.id, session.currentStep.id);
      }
      return await this.activateFlowSession(params);
    }
    if (contentType === ContentDataType.CHECKLIST) {
      return await this.activateChecklistSession(params);
    }
    return false;
  }

  /**
   * Activate flow session
   * @param params - The activate session parameters
   * @returns True if the session was activated successfully
   */
  private async activateFlowSession(params: ActivateSessionParams) {
    const { socket, session, postTracks, forceGoToStep, socketData } = params;
    const options = {
      trackConditions: postTracks,
      forceGoToStep,
      cleanupContentTypes: [ContentDataType.FLOW],
    };
    return await this.socketOperationService.activateFlowSession(
      socket as unknown as Socket,
      socketData,
      session,
      options,
    );
  }

  /**
   * Activate checklist session
   * @param params - The activate session parameters
   * @returns True if the session was activated successfully
   */
  private async activateChecklistSession(params: ActivateSessionParams) {
    const { socket, session, postTracks, socketData } = params;
    const { environment, clientContext } = socketData;
    const options = {
      trackConditions: postTracks,
      cleanupContentTypes: [ContentDataType.CHECKLIST],
    };
    const previousSession = extractSessionByContentType(socketData, ContentDataType.CHECKLIST);
    const newCompletedItems = extractChecklistNewCompletedItems(
      session?.version?.checklist?.items ?? [],
      previousSession?.version?.checklist?.items ?? [],
    );

    if (newCompletedItems.length > 0) {
      // Track events for each completed task
      const trackingPromises = newCompletedItems.map((taskId) =>
        this.eventTrackingService.trackChecklistTaskCompletedEvent(
          session.id,
          taskId,
          environment,
          clientContext,
        ),
      );
      await Promise.all(trackingPromises);
      // Emit events for all tasks
      this.socketOperationService.emitChecklistTasksCompleted(socket, newCompletedItems);
    }
    const checklistData = session.version.checklist;
    if (checklistData) {
      const items = checklistData.items.filter((item) => item.isVisible);
      session.version.checklist = {
        ...checklistData,
        items,
      };
    }
    return await this.socketOperationService.activateChecklistSession(
      socket as unknown as Socket,
      socketData,
      session,
      options,
    );
  }

  /**
   * Activate other socket session
   * @param params - The activate session parameters
   * @returns True if the session was activated successfully
   */
  private async activateOtherSocketSession(params: ActivateSessionParams) {
    const { socket } = params;
    const lockKey = buildSocketLockKey(socket.id);

    return (
      (await this.distributedLockService.withRetryLock(
        lockKey,
        async () => {
          const socketData = await this.getSocketData(socket);
          if (!socketData) {
            return false;
          }
          return await this.activateSocketSession({
            ...params,
            socketData,
          });
        },
        3, // Retry 3 times
        100, // Retry interval 100ms
        5000, // Lock timeout 5 seconds
      )) ?? false
    );
  }

  /**
   * Activate socket sessions for all sockets in the same room
   * @param server - The WebSocket server
   * @param roomId - The room ID
   * @param params - The activate session parameters
   * @returns Promise<boolean> - True if activation was successful
   */
  private async activateOtherSocketsInRoom(
    roomId: string,
    params: ActivateSessionParams,
  ): Promise<boolean> {
    try {
      const { server, socket: currentSocket } = params;
      const sockets = await server.in(roomId).fetchSockets();

      if (sockets.length === 0) {
        return false;
      }

      const activatePromises = sockets
        .filter((socket) => socket.id !== currentSocket.id)
        .map((socket) =>
          this.activateOtherSocketSession({
            ...params,
            socket: socket as unknown as Socket,
          }),
        );

      await Promise.allSettled(activatePromises);

      return true;
    } catch (error) {
      this.logger.error(`Failed to activate all sockets in room: ${error.message}`);
      return false;
    }
  }

  private async tryAutoStartContent(
    context: ContentStartContext,
    options: TryAutoStartContentOptions = {},
  ): Promise<ContentStartResult> {
    const { socketData, contentType } = context;
    const {
      excludeContentIds = extractExcludedContentIds(socketData, contentType),
      allowWaitTimers = true,
      fallback = true,
    } = options;

    // Get evaluated content versions once and reuse for both strategy executions
    const evaluatedContentVersions = await this.getEvaluatedContentVersions(
      socketData,
      contentType,
    );

    // Early return if no content versions available
    if (evaluatedContentVersions.length === 0) {
      return {
        success: false,
        reason: 'No content versions available',
      };
    }

    // First attempt: Try with excluded content IDs if any exist
    if (excludeContentIds.length > 0) {
      const excludedResult = await this.executeContentStartStrategies(
        context,
        contentType,
        evaluatedContentVersions,
        excludeContentIds,
      );

      // Return result if it has actionable content (session or wait timers)
      const { success, session, waitTimers } = excludedResult;
      const canReturnWithSession = success && session;
      const canReturnWithWaitTimers = success && allowWaitTimers && waitTimers?.length;

      if (canReturnWithSession || canReturnWithWaitTimers) {
        return excludedResult;
      }
      // Otherwise, continue to fallback
    }

    // Skip second attempt if fallback is disabled
    if (!fallback) {
      return {
        success: false,
        reason: 'No actionable content found and fallback is disabled',
      };
    }

    // Second attempt: Try with all content versions (no exclusions)
    return await this.executeContentStartStrategies(context, contentType, evaluatedContentVersions);
  }

  /**
   * Attempts to start content using multiple strategies in priority order
   * Uses pre-fetched content versions to avoid duplicate database queries
   * @param context - The content start context
   * @param contentType - The content type to start
   * @param evaluatedContentVersions - Pre-evaluated content versions to consider
   * @param excludedContentIds - Optional list of content IDs to exclude from this attempt
   * @returns Promise<ContentStartResult> - The result of the strategy execution
   */
  private async executeContentStartStrategies(
    context: ContentStartContext,
    contentType: ContentDataType,
    evaluatedContentVersions: CustomContentVersion[],
    excludedContentIds: string[] = [],
  ): Promise<ContentStartResult> {
    const { socketData } = context;

    // Filter out excluded content IDs if provided
    const availableVersions =
      excludedContentIds.length > 0
        ? evaluatedContentVersions.filter(
            (version) => !excludedContentIds.includes(version.content.id),
          )
        : evaluatedContentVersions;

    // Strategy 1: Try to start by latest activated content version
    const latestVersionResult = await this.tryStartByLatestActivatedContentVersion(
      context,
      availableVersions,
    );
    this.logger.debug(`Latest version strategy result: ${latestVersionResult.reason}`);
    if (latestVersionResult.success) {
      return latestVersionResult;
    }

    // Strategy 2: Try to start by auto-start conditions
    const autoStartResult = await this.tryStartByAutoStartConditions(context, availableVersions);
    this.logger.debug(`Auto-start strategy result: ${autoStartResult.reason}`);
    if (autoStartResult.success) {
      return autoStartResult;
    }

    // Strategy 3: Setup wait timer conditions for future activation
    const waitTimerResult = this.prepareConditionWaitTimersResult(
      availableVersions,
      contentType,
      socketData.clientConditions,
    );
    this.logger.debug(`Wait timer strategy result: ${waitTimerResult.reason}`);
    if (waitTimerResult.success) {
      return waitTimerResult;
    }

    // Strategy 4: Extract and setup tracking conditions for future activation
    return await this.extractClientConditions(contentType, availableVersions);
  }

  /**
   * Handles the result of content start operations
   * Processes ContentStartResult and performs necessary WebSocket operations
   */
  private async handleContentStartResult(
    context: ContentStartContext,
    result: ContentStartResult,
  ): Promise<boolean> {
    const { success, preTracks, waitTimers } = result;
    const { socket, socketData } = context;

    // Early return if operation failed
    if (!success) {
      this.logger.warn(`Handle content start result, failed, reason: ${result.reason}`);
      return false;
    }

    // Handle tracking conditions
    if (preTracks && preTracks.length > 0) {
      return await this.socketOperationService.trackClientConditions(socket, socketData, preTracks);
    }

    // Handle condition wait timers
    if (waitTimers && waitTimers.length > 0) {
      return await this.socketOperationService.startConditionWaitTimers(
        socket,
        socketData,
        waitTimers,
      );
    }

    return await this.handleSessionActivation(context, result);
  }

  /**
   * Handles session activation and setup
   */
  private async handleSessionActivation(
    context: ContentStartContext,
    result: ContentStartResult,
  ): Promise<boolean> {
    const { server, socketData, socket } = context;
    const { environment, externalUserId } = socketData;
    const { session, postTracks, forceGoToStep = false, isActivateOtherSockets = true } = result;

    if (!session) {
      this.logger.warn(
        `Handle session activation, session: null, result: ${JSON.stringify(result)}`,
      );
      return false;
    }

    const roomId = buildExternalUserRoomId(environment.id, externalUserId);
    const activateSessionParams = {
      server,
      socket,
      session,
      socketData,
      postTracks,
      forceGoToStep,
    };

    this.logger.debug(
      `Handle session activation, session: ${session.id}, reason: ${result.reason}`,
    );

    if (!(await this.activateSocketSession(activateSessionParams))) {
      return false;
    }
    if (isActivateOtherSockets) {
      await this.activateOtherSocketsInRoom(roomId, activateSessionParams);
    }
    // Check hide conditions and cancel content if necessary
    return await this.checkHideConditions(context, session);
  }

  /**
   * Checks hide conditions and cancels content if necessary
   */
  private async checkHideConditions(
    context: ContentStartContext,
    session: CustomContentSession,
  ): Promise<boolean> {
    const { socket, server, contentType } = context;
    const socketData = await this.getSocketData(socket);
    if (!socketData) {
      return true;
    }
    const sessionId = session.id;
    const sessionVersion = await this.getEvaluatedContentVersion(
      socketData,
      contentType,
      session.version.id,
    );

    if (!sessionVersion || isActivedHideRules(sessionVersion)) {
      this.logger.debug(`Hide rules are activated, canceling session, sessionId: ${sessionId}`);
      // Cleanup socket session
      return await this.cancelSocketSession({
        server,
        socket,
        socketData,
        sessionId,
      });
    }

    return true;
  }

  /**
   * Strategy 1: Try to start content by specific contentId
   */
  private async tryStartByContentId(context: ContentStartContext): Promise<ContentStartResult> {
    const { contentType, options, socketData } = context;
    const { contentId } = options!;
    const { environment } = socketData;

    const publishedVersionId = await this.getPublishedVersionId(contentId, environment);
    if (!publishedVersionId) {
      return {
        success: false,
        reason: 'Content not found or not published',
      };
    }
    const evaluatedContentVersion = await this.getEvaluatedContentVersion(
      socketData,
      contentType,
      publishedVersionId,
    );
    if (!evaluatedContentVersion) {
      return {
        success: false,
        reason: 'Content version not available or not activated',
      };
    }
    const latestActivatedContentVersion = await this.findAndUpdateActivatedCustomContentVersion(
      socketData,
      contentType,
      evaluatedContentVersion,
    );
    const steps = latestActivatedContentVersion?.steps ?? [];
    const stepCvid = options?.stepCvid || steps?.[0]?.cvid;

    return await this.handleContentVersion(
      {
        ...context,
        options: {
          ...options,
          stepCvid,
        },
      },
      latestActivatedContentVersion,
    );
  }

  /**
   * Strategy 2: Handle existing session validation
   */
  private async handleExistingSession(context: ContentStartContext): Promise<ContentStartResult> {
    const { contentType, socketData } = context;

    const session = extractSessionByContentType(socketData, contentType);
    if (!session) {
      return { success: false, reason: 'No existing session' };
    }

    const customContentVersion = await this.getEvaluatedContentVersion(
      socketData,
      contentType,
      session.version.id,
    );
    if (!customContentVersion) {
      return { success: false, reason: 'No custom content version found' };
    }

    const result = await this.handleContentVersion(context, customContentVersion);
    if (!result.success) {
      return result;
    }

    // Handle active session cases
    return {
      ...result,
      reason: 'Existing active session',
    };
  }

  /**
   * Find the latest activated content version, potentially updated by latest session version
   */
  private async findAndUpdateActivatedCustomContentVersion(
    socketData: SocketData,
    contentType: ContentDataType,
    evaluatedContentVersion: CustomContentVersion,
  ): Promise<CustomContentVersion> {
    if (
      !sessionIsAvailable(evaluatedContentVersion.session.latestSession, contentType) ||
      contentType === ContentDataType.CHECKLIST
    ) {
      return evaluatedContentVersion;
    }
    const latestActivatedContentVersionId =
      evaluatedContentVersion.session.latestSession?.versionId;
    if (
      latestActivatedContentVersionId &&
      evaluatedContentVersion.id !== latestActivatedContentVersionId
    ) {
      const activatedContentVersion = await this.getEvaluatedContentVersion(
        socketData,
        contentType,
        latestActivatedContentVersionId,
      );
      if (activatedContentVersion) {
        return activatedContentVersion;
      }
    }
    return evaluatedContentVersion;
  }

  /**
   * Strategy 3: Try to start by latest activated content version
   */
  private async tryStartByLatestActivatedContentVersion(
    context: ContentStartContext,
    evaluatedContentVersions: CustomContentVersion[],
  ): Promise<ContentStartResult> {
    const { contentType, socketData } = context;
    const { clientConditions } = socketData;

    const latestActivatedContentVersions = findLatestActivatedCustomContentVersions(
      evaluatedContentVersions,
      contentType,
      clientConditions,
    );
    const latestActivatedContentVersion = latestActivatedContentVersions?.[0];

    // Check if content version is allowed by hide rules
    if (!latestActivatedContentVersion) {
      return {
        success: false,
        reason: 'No latest activated content version found',
      };
    }

    const customContentVersion = await this.findAndUpdateActivatedCustomContentVersion(
      socketData,
      contentType,
      latestActivatedContentVersion,
    );

    const result = await this.handleContentVersion(context, customContentVersion);

    return {
      ...result,
      reason: result.success ? 'Started by latest activated version' : result.reason,
    };
  }

  /**
   * Strategy 4: Try to start by auto start conditions
   */
  private async tryStartByAutoStartConditions(
    context: ContentStartContext,
    evaluatedContentVersions: CustomContentVersion[],
  ): Promise<ContentStartResult> {
    const { contentType, socketData } = context;
    const { clientConditions, waitTimers } = socketData;
    const autoStartContentVersions = filterAvailableAutoStartContentVersions(
      evaluatedContentVersions,
      contentType,
      clientConditions,
      waitTimers,
    );
    const autoStartContentVersion = autoStartContentVersions?.[0];

    if (!autoStartContentVersion) {
      return {
        success: false,
        reason: 'No auto-start content version available',
      };
    }

    const result = await this.handleContentVersion(context, autoStartContentVersion);

    return {
      ...result,
      reason: result.success ? 'Started by auto-start conditions' : result.reason,
    };
  }

  /**
   * Prepare wait timer conditions result for future activation
   */
  private prepareConditionWaitTimersResult(
    evaluatedContentVersions: CustomContentVersion[],
    contentType: ContentDataType,
    clientConditions: ClientCondition[],
  ): ContentStartResult {
    const autoStartContentVersionsWithoutWaitTimer = filterAvailableAutoStartContentVersions(
      evaluatedContentVersions,
      contentType,
      clientConditions,
    );

    const waitTimers = extractClientConditionWaitTimers(autoStartContentVersionsWithoutWaitTimer);

    if (waitTimers.length > 0) {
      return {
        success: true,
        waitTimers,
        reason: 'Setup wait timer conditions for future activation',
      };
    }

    return {
      success: false,
      reason: 'No wait timer conditions available',
    };
  }

  /**
   * Strategy 6: Setup tracking conditions for future activation
   */
  private async extractClientConditions(
    contentType: ContentDataType,
    evaluatedContentVersions: CustomContentVersion[],
  ): Promise<ContentStartResult> {
    const trackCustomContentVersions: CustomContentVersion[] =
      filterActivatedContentWithoutClientConditions(evaluatedContentVersions, contentType);

    const preTracks = extractClientTrackConditions(
      trackCustomContentVersions,
      ConditionExtractionMode.BOTH,
    );

    if (preTracks.length > 0) {
      // This would need to be implemented in the calling service
      // as it involves WebSocket-specific operations
      return {
        success: true,
        preTracks,
        reason: 'Setup tracking conditions for future activation',
      };
    }

    return {
      success: true,
      reason: 'No content available for activation or tracking',
    };
  }

  /**
   * Prepare business session info (find existing or create new) and track auto-start event
   * Returns sessionId and currentStepCvid for content session initialization
   */
  private async prepareBizSessionInfo(
    customContentVersion: CustomContentVersion,
    socketData: SocketData,
    startOptions?: StartContentOptions,
  ): Promise<ContentStartResult & { sessionId?: string; currentStepCvid?: string }> {
    const { environment, externalUserId, externalCompanyId, clientContext } = socketData;
    const startReason = startOptions?.startReason;
    const versionId = customContentVersion.id;

    const session = customContentVersion.session;
    const contentType = customContentVersion.content.type as ContentDataType;
    const currentStepCvid = findCurrentStepCvid(customContentVersion, startOptions);
    const sessionId = findAvailableSessionId(session.latestSession, contentType);
    if (sessionId) {
      return {
        success: true,
        sessionId,
        currentStepCvid,
      };
    }
    const bizSession = await this.sessionBuilderService.createBizSession(
      environment,
      externalUserId,
      externalCompanyId,
      versionId,
    );

    if (!bizSession) {
      return {
        success: false,
        reason: 'Failed to create business session',
      };
    }
    const steps = customContentVersion?.steps ?? [];
    const stepId = steps.find((step) => step.cvid === currentStepCvid)?.id ?? null;

    const result = await this.eventTrackingService.trackAutoStartEvent(
      customContentVersion,
      bizSession,
      environment,
      externalUserId,
      startReason,
      stepId,
      clientContext,
    );

    if (!result) {
      return {
        success: false,
        reason: 'Failed to track auto start event',
      };
    }

    return {
      success: true,
      sessionId: bizSession.id,
      currentStepCvid,
    };
  }

  /**
   * Handles content version validation, session initialization and tracking conditions setup
   */
  private async handleContentVersion(
    context: ContentStartContext,
    customContentVersion: CustomContentVersion,
  ): Promise<ContentStartResult> {
    const { options, socketData } = context;

    // Handle session initialization
    const session = await this.initializeSession(customContentVersion, socketData, options);

    if (!session) {
      return {
        success: false,
        reason: 'Failed to initialize session',
      };
    }

    // Extract tracking conditions for hide conditions
    const hideConditions = extractClientTrackConditions(
      [customContentVersion],
      ConditionExtractionMode.HIDE_ONLY,
    );
    // Extract tracking conditions for checklist conditions
    const checklistConditions = extractChecklistTrackConditions(session);
    const postTracks = [...hideConditions, ...checklistConditions];

    return {
      success: true,
      session,
      postTracks,
      reason: 'Content session created successfully',
    };
  }

  /**
   * Initializes a session for the content version
   */
  private async initializeSession(
    customContentVersion: CustomContentVersion,
    socketData: SocketData,
    options?: StartContentOptions,
    skipBizSession = false,
  ): Promise<CustomContentSession | null> {
    let sessionId: string | undefined;
    let currentStepCvid: string | undefined;
    if (!skipBizSession) {
      const sessionResult = await this.prepareBizSessionInfo(
        customContentVersion,
        socketData,
        options,
      );
      if (!sessionResult.success) {
        return null;
      }
      currentStepCvid = sessionResult.currentStepCvid;
      sessionId = sessionResult.sessionId;
    }

    // Create content session
    return await this.sessionBuilderService.createContentSession(
      customContentVersion,
      socketData,
      sessionId,
      currentStepCvid,
    );
  }

  /**
   * Get evaluated content versions
   */
  private async getEvaluatedContentVersions(
    socketData: SocketData,
    contentType: ContentDataType,
    versionId?: string,
  ): Promise<CustomContentVersion[]> {
    const { environment, externalUserId, externalCompanyId, clientContext } = socketData;

    const { clientConditions } = socketData;

    // Extract activated and deactivated condition IDs
    const activatedIds = clientConditions
      ?.filter((clientCondition: ClientCondition) => clientCondition.isActive === true)
      .map((clientCondition: ClientCondition) => clientCondition.conditionId);

    const deactivatedIds = clientConditions
      ?.filter((clientCondition: ClientCondition) => clientCondition.isActive === false)
      .map((clientCondition: ClientCondition) => clientCondition.conditionId);

    const contentVersions = await this.dataResolverService.fetchCustomContentVersions(
      environment,
      externalUserId,
      externalCompanyId,
      versionId,
    );

    const filteredContentVersions = contentVersions.filter((contentVersion) =>
      [contentType].includes(contentVersion.content.type as ContentDataType),
    );

    // Evaluate content versions with proper conditions
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
   * Get evaluated content version by version ID
   * This method is optimized for querying a single version by ID
   */
  private async getEvaluatedContentVersion(
    socketData: SocketData,
    contentType: ContentDataType,
    versionId: string,
  ): Promise<CustomContentVersion | null> {
    const evaluatedVersions = await this.getEvaluatedContentVersions(
      socketData,
      contentType,
      versionId,
    );
    return evaluatedVersions?.[0] || null;
  }

  /**
   * Get published version ID for specific content
   * @param contentId - The content ID to get version for
   * @param environment - The environment
   * @returns The published version ID or undefined if not found
   */
  private async getPublishedVersionId(
    contentId: string | undefined,
    environment: Environment,
  ): Promise<string | undefined> {
    if (!contentId) {
      return undefined;
    }

    const publishedVersionId = await this.dataResolverService.findPublishedContentVersionId(
      contentId,
      environment.id,
    );

    if (!publishedVersionId) {
      this.logger.warn(
        `Published version not found for content: ${contentId} in environment: ${environment.id}`,
      );
      return undefined;
    }

    return publishedVersionId;
  }

  /**
   * Initialize content session by session ID
   * @param sessionId - The session ID
   * @returns The content session or null if not found
   */
  async initializeSessionById(
    socketData: SocketData,
    sessionId: string,
  ): Promise<CustomContentSession | null> {
    const session = await this.sessionBuilderService.getBizSessionWithContentAndVersion(sessionId);
    if (!session) {
      return null;
    }
    const contentType = session.content.type as ContentDataType;
    const customContentVersion = await this.getEvaluatedContentVersion(
      socketData,
      contentType,
      session.versionId,
    );
    if (!customContentVersion || customContentVersion.session.latestSession.id !== sessionId) {
      return null;
    }
    return await this.initializeSession(customContentVersion, socketData, undefined);
  }

  /**
   * Start launchers
   * @param context - The content start context
   * @returns True if the launchers were started successfully
   */
  async startLaunchers(context: ContentStartContext): Promise<boolean> {
    // 1. Prepare launcher data
    const preparationResult = await this.prepareLauncherData(context);
    if (!preparationResult.success) {
      return false;
    }

    // 2. Create launcher sessions
    const sessions = await this.createLauncherSessions(
      preparationResult.availableVersions,
      context.socketData,
      preparationResult.startReason,
      preparationResult.versionId,
    );

    // 3. Execute launcher operations
    return await this.executeLauncherOperations(
      context.socket,
      context.socketData,
      sessions,
      preparationResult.shouldTrackVersions,
    );
  }

  /**
   * Prepare launcher data for processing
   * @param context - The content start context
   * @returns Launcher data preparation result
   */
  private async prepareLauncherData(
    context: ContentStartContext,
  ): Promise<LauncherDataPreparationResult> {
    const { socketData, options } = context;
    const { clientConditions, environment } = socketData;
    const { contentId, startReason = contentStartReason.START_FROM_CONDITION } = options ?? {};
    const contentType = ContentDataType.LAUNCHER;

    // Get published version ID if needed
    const versionId = await this.getPublishedVersionId(contentId, environment);
    if (contentId && !versionId) {
      return { success: false, availableVersions: [], shouldTrackVersions: [], startReason };
    }

    // Get evaluated content versions once and reuse for both strategy executions
    const evaluatedContentVersions = await this.getEvaluatedContentVersions(
      socketData,
      contentType,
      versionId,
    );
    const availableContentVersions = filterAvailableLauncherContentVersions(
      evaluatedContentVersions,
      clientConditions,
    );
    const shouldTrackVersions = evaluatedContentVersions.filter(
      (version) =>
        !availableContentVersions.find(
          (availableVersion) => availableVersion.contentId === version.contentId,
        ),
    );

    return {
      success: true,
      availableVersions: availableContentVersions,
      shouldTrackVersions,
      startReason,
      versionId,
    };
  }

  /**
   * Create launcher sessions for available content versions
   * @param availableVersions - Available content versions
   * @param socketData - Socket data
   * @param startReason - Start reason
   * @param versionId - Version ID
   * @returns Array of created sessions
   */
  private async createLauncherSessions(
    availableVersions: CustomContentVersion[],
    socketData: SocketData,
    startReason: contentStartReason,
    versionId?: string,
  ): Promise<CustomContentSession[]> {
    const contentType = ContentDataType.LAUNCHER;
    const sessions: CustomContentSession[] = [];

    for (const contentVersion of availableVersions) {
      const isAvailable = sessionIsAvailable(contentVersion.session.latestSession, contentType);

      // Skip bizSession processing when session is not available and no versionId is specified
      const skipBizSession = !isAvailable && !versionId;

      const result = await this.initializeSession(
        contentVersion,
        socketData,
        { startReason },
        skipBizSession,
      );

      if (result) {
        sessions.push(result);
      }
    }

    return sessions;
  }

  /**
   * Execute launcher operations including adding launchers and tracking conditions
   * @param socket - Socket instance
   * @param socketData - Socket data
   * @param sessions - Sessions to add
   * @param shouldTrackVersions - Versions to track
   * @returns True if operations were successful
   */
  private async executeLauncherOperations(
    socket: Socket,
    socketData: SocketData,
    sessions: CustomContentSession[],
    shouldTrackVersions: CustomContentVersion[],
  ): Promise<boolean> {
    const contentType = ContentDataType.LAUNCHER;

    // Add launchers to socket
    const success = await this.socketOperationService.addLaunchers(socket, socketData, sessions);
    if (!success) {
      return false;
    }

    // Extract and track client conditions
    const { preTracks = [] } = await this.extractClientConditions(contentType, shouldTrackVersions);

    if (preTracks.length === 0) {
      return true;
    }

    const newSocketData = await this.getSocketData(socket);
    if (!newSocketData) {
      return false;
    }

    return await this.socketOperationService.trackClientConditions(
      socket,
      newSocketData,
      preTracks,
    );
  }

  /**
   * Initialize launcher session by content ID
   * @param socketData - Socket data
   * @param contentId - Content ID
   * @returns The initialized session or null if not found
   */
  async initializeLauncherSession(
    socketData: SocketData,
    contentId: string,
  ): Promise<CustomContentSession | null> {
    const { environment } = socketData;
    const contentType = ContentDataType.LAUNCHER;

    const versionId = await this.getPublishedVersionId(contentId, environment);
    if (!versionId) {
      return null;
    }
    const customContentVersion = await this.getEvaluatedContentVersion(
      socketData,
      contentType,
      versionId,
    );
    if (!customContentVersion) {
      return null;
    }
    return await this.initializeSession(customContentVersion, socketData);
  }
}
