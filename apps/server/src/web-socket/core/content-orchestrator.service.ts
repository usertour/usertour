import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { DistributedLockService } from './distributed-lock.service';
import { ContentDataType, RulesType } from '@usertour/types';
import {
  filterActivatedContentWithoutClientConditions,
  findLatestActivatedCustomContentVersions,
  filterAvailableAutoStartContentVersions,
  isActivedHideRules,
  extractClientTrackConditions,
  evaluateCustomContentVersion,
  findAvailableSessionId,
  findLatestStepCvid,
  extractClientConditionWaitTimers,
  sessionIsAvailable,
  extractChecklistNewCompletedItems,
  extractChecklistShowAnimationItems,
  extractChecklistTrackConditions,
} from '@/utils/content-utils';
import {
  buildExternalUserRoomId,
  extractContentTypeBySessionId,
  extractExcludedContentIds,
  extractSessionByContentType,
  buildSocketLockKey,
} from '@/utils/websocket-utils';
import { SocketRedisService } from './socket-redis.service';
import {
  StartContentOptions,
  TrackCondition,
  CustomContentSession,
  ConditionWaitTimer,
  ClientCondition,
  SocketClientData,
  CustomContentVersion,
  ContentStartContext,
  ContentCancelContext,
  CancelSessionParams,
  ActivateSessionParams,
  ContentStartResult,
  TryAutoStartContentOptions,
  ConditionExtractionMode,
} from '@/common/types';
import { DataResolverService } from './data-resolver.service';
import { SessionBuilderService } from './session-builder.service';
import { EventTrackingService } from './event-tracking.service';
import { ActivateSocketSessionOptions, SocketSessionService } from './socket-session.service';
import { SocketParallelService } from './socket-parallel.service';

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
    private readonly socketSessionService: SocketSessionService,
    private readonly socketParallelService: SocketParallelService,
    private readonly socketRedisService: SocketRedisService,
    private readonly distributedLockService: DistributedLockService,
  ) {}

  /**
   * Get socket client data from Redis
   * @param socket - The socket instance
   * @returns Promise<SocketClientData | null>
   */
  private async getSocketClientData(socket: Socket): Promise<SocketClientData | null> {
    return await this.socketRedisService.getClientData(socket.id);
  }

  /**
   * Update socket client data in Redis
   * @param socket - The socket instance
   * @param updates - Partial data to update
   * @returns Promise<boolean>
   */
  private async updateSocketClientData(
    socket: Socket,
    updates: Partial<SocketClientData>,
  ): Promise<boolean> {
    return await this.socketRedisService.updateClientData(socket.id, updates);
  }

  /**
   * Main entry point for starting singleton content
   * Implements multiple strategies for content activation and coordinates the start process
   * No longer needs distributed lock as message queue ensures ordered execution
   */
  async startContent(context: ContentStartContext): Promise<boolean> {
    const { options } = context;
    const contentId = options?.contentId;

    try {
      // Strategy 1: Try to start by specific contentId
      if (contentId) {
        const result = await this.tryStartByContentId(context);
        if (!result.success) {
          return false;
        }
        return await this.handleSuccessfulSession(context, { ...result, forceGoToStep: true });
      }

      // Strategy 2: Handle existing session
      const existingSessionResult = await this.handleExistingSession(context);
      if (existingSessionResult.success) {
        return await this.handleSuccessfulSession(context, existingSessionResult);
      }

      // Strategy 3: Try to auto start content
      return await this.tryAutoStartContent(context);
    } catch (error) {
      this.logger.error(`Failed to start singleton content: ${error.message}`);
      return false;
    }
  }

  /**
   * Cancel content
   * No longer needs distributed lock as message queue ensures ordered execution
   * @param context - The content cancel context
   * @returns True if the content was canceled successfully
   */
  async cancelContent(context: ContentCancelContext): Promise<boolean> {
    const { server, socket, sessionId, cancelOtherSessions = true } = context;

    const socketClientData = await this.getSocketClientData(socket);
    if (!socketClientData) {
      return false;
    }
    const { environment, externalUserId } = socketClientData;
    const roomId = buildExternalUserRoomId(environment.id, externalUserId);

    // Define common cancel session parameters
    const cancelSessionParams: CancelSessionParams = {
      server,
      socket,
      socketClientData,
      sessionId,
      shouldSetLastDismissedId: true,
    };

    // Cleanup socket session
    await this.cancelSocketSession({ ...cancelSessionParams, shouldUnsetSession: false });
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
    const { server, socket, sessionId, socketClientData } = params;
    const contentType = extractContentTypeBySessionId(socketClientData, sessionId);
    const currentSession = extractSessionByContentType(socketClientData, contentType);
    const context = {
      server,
      socket,
      socketClientData,
      contentType,
    };
    // If the current session is not the same as the session id, return false
    if (currentSession && currentSession.id !== sessionId) {
      return false;
    }
    const excludeContentIds = [currentSession?.content?.id].filter(Boolean) as string[];
    const tryAutoStartContentOptions: TryAutoStartContentOptions = {
      isActivateOtherSockets: false,
    };

    // Execute content start strategies with fallback behavior
    const strategyResult = await this.tryAutoStartContent(context, {
      ...tryAutoStartContentOptions,
      excludeContentIds: excludeContentIds,
      allowWaitTimers: false,
      fallback: false,
    });

    this.logger.debug(`CancelSocketSession strategy result: ${strategyResult}`);

    // If the strategy result is successful, return it
    if (strategyResult) {
      return true;
    }

    // Cleanup current session if exists
    const cleanupResult = await this.cleanupCurrentSessionIfNeeded(currentSession, params);
    this.logger.debug(`CleanupCurrentSessionIfNeeded result: ${JSON.stringify(cleanupResult)}`);

    if (!cleanupResult.success) {
      return false;
    }
    // Update context with updated client data
    if (cleanupResult.updatedClientData) {
      context.socketClientData = cleanupResult.updatedClientData;
    }
    // Execute content start strategies and handle the result
    return await this.tryAutoStartContent(context, tryAutoStartContentOptions);
  }

  /**
   * Cleanup current session if it exists and return updated client data
   * @param currentSession - The current session to cleanup
   * @param socket - The socket instance
   * @param socketClientData - The current socket client data
   * @param sessionId - The session ID to cleanup
   * @returns Cleanup result with success status and updated client data
   */
  private async cleanupCurrentSessionIfNeeded(
    currentSession: CustomContentSession | null,
    params: CancelSessionParams,
  ): Promise<{ success: boolean; updatedClientData?: SocketClientData }> {
    if (!currentSession) {
      return { success: true };
    }
    const {
      socket,
      socketClientData,
      shouldUnsetSession = true,
      shouldSetLastDismissedId = false,
    } = params;

    const isCleaned = await this.socketSessionService.cleanupSocketSession(
      socket,
      socketClientData,
      currentSession,
      { shouldUnsetSession, shouldSetLastDismissedId },
    );

    if (!isCleaned) {
      return { success: false };
    }

    const updatedClientData = await this.getSocketClientData(socket);
    if (!updatedClientData) {
      return { success: false };
    }

    return { success: true, updatedClientData };
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
          const socketClientData = await this.getSocketClientData(socket);
          if (!socketClientData) {
            return false;
          }
          return await this.cancelSocketSession({
            ...params,
            socketClientData,
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
      if (sockets.length === 0 || sockets.length > 100) {
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
    const { socketClientData, session } = params;
    if (!socketClientData || !session) {
      return false;
    }
    const contentType = session.content.type as ContentDataType;
    if (contentType === ContentDataType.FLOW) {
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
    const { socket, session, postTracks, forceGoToStep, socketClientData } = params;
    const options: ActivateSocketSessionOptions = {
      trackConditions: postTracks,
      forceGoToStep,
    };
    return await this.socketSessionService.activateSocketSession(
      socket as unknown as Socket,
      socketClientData,
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
    const { socket, session, postTracks, socketClientData } = params;
    const options: ActivateSocketSessionOptions = {
      trackConditions: postTracks,
      forceGoToStep: false,
    };
    const currentSession = extractSessionByContentType(socketClientData, ContentDataType.CHECKLIST);
    const newCompletedItems = currentSession
      ? extractChecklistNewCompletedItems(
          session.version.checklist?.items || [],
          currentSession?.version.checklist?.items || [],
        )
      : extractChecklistShowAnimationItems(session.version.checklist?.items || []);

    if (newCompletedItems.length > 0) {
      this.socketSessionService.emitChecklistTasksCompleted(socket, newCompletedItems);
    }
    return await this.socketSessionService.activateSocketSession(
      socket as unknown as Socket,
      socketClientData,
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
          const { session } = params;
          const socketClientData = await this.getSocketClientData(socket);
          if (!socketClientData) {
            return false;
          }
          const contentType = session.content.type;
          // If the session is already activated, return false
          if (extractSessionByContentType(socketClientData, contentType)) {
            return false;
          }
          return await this.activateSocketSession({
            ...params,
            socketClientData,
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

      if (sockets.length === 0 || sockets.length > 100) {
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

  /**
   * Try to auto start content with configurable fallback behavior
   * @param context - The content start context
   * @param contentType - The content type
   * @param options - Configuration options for the strategy execution
   * @returns Promise<boolean> - True if the content was started successfully
   */
  private async tryAutoStartContent(
    context: ContentStartContext,
    options: TryAutoStartContentOptions = {},
  ): Promise<boolean> {
    const { socketClientData, contentType } = context;
    const {
      excludeContentIds = extractExcludedContentIds(socketClientData, contentType),
      isActivateOtherSockets = true,
      allowWaitTimers = true,
      fallback = true,
    } = options;

    // Get evaluated content versions once and reuse for both strategy executions
    const evaluatedContentVersions = await this.getEvaluatedContentVersions(
      socketClientData,
      contentType,
    );

    // First attempt: Try with excluded content IDs if any exist
    if (excludeContentIds.length > 0) {
      const result = await this.executeContentStartStrategies(
        context,
        contentType,
        evaluatedContentVersions,
        excludeContentIds,
      );

      const { success, session, waitTimers } = result;
      if (success) {
        const shouldAllowWaitTimers = allowWaitTimers && waitTimers?.length;
        if (session || shouldAllowWaitTimers) {
          return await this.handleContentStartResult(context, {
            ...result,
            isActivateOtherSockets,
          });
        }
      }
    }

    // Skip second attempt if fallback is disabled
    if (!fallback) {
      return false;
    }

    // Second attempt: Try with all content versions (no exclusions)
    const result = await this.executeContentStartStrategies(
      context,
      contentType,
      evaluatedContentVersions,
    );

    return await this.handleContentStartResult(context, { ...result, isActivateOtherSockets });
  }
  /**
   * Execute content start strategies with pre-fetched content versions
   * This method avoids duplicate database queries by accepting pre-fetched versions
   */
  private async executeContentStartStrategies(
    context: ContentStartContext,
    contentType: ContentDataType,
    evaluatedContentVersions: CustomContentVersion[],
    excludeContentIds: string[] = [],
  ): Promise<ContentStartResult> {
    const { socketClientData } = context;

    // Filter out excluded content IDs if provided
    const filteredContentVersions =
      excludeContentIds.length > 0
        ? evaluatedContentVersions.filter(
            (contentVersion) => !excludeContentIds.includes(contentVersion.content.id),
          )
        : evaluatedContentVersions;

    // Strategy 3: Try to start by latest activated content version
    const latestVersionResult = await this.tryStartByLatestActivatedContentVersion(
      context,
      filteredContentVersions,
    );

    this.logger.debug(`Latest version result: ${latestVersionResult.reason}`);

    if (latestVersionResult.success) {
      return latestVersionResult;
    }

    // Strategy 4: Try to start by auto start conditions
    const autoStartResult = await this.tryStartByAutoStartConditions(
      context,
      filteredContentVersions,
    );
    this.logger.debug(`Auto start result: ${autoStartResult.reason}`);
    if (autoStartResult.success) {
      return autoStartResult;
    }

    // Strategy 5: Setup wait timer conditions for future activation
    const waitTimerResult = this.prepareConditionWaitTimersResult(
      filteredContentVersions,
      contentType,
      socketClientData.clientConditions,
    );
    this.logger.debug(`Wait timer result: ${waitTimerResult.reason}`);
    if (waitTimerResult.success) {
      return waitTimerResult;
    }

    return await this.extractClientConditions(contentType, filteredContentVersions);
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

    // Early return if operation failed
    if (!success) {
      return false;
    }

    // Handle tracking conditions
    if (preTracks && preTracks.length > 0) {
      return await this.handleTrackingConditions(context, preTracks);
    }

    // Handle condition wait timers
    if (waitTimers && waitTimers.length > 0) {
      return await this.handleConditionWaitTimers(context, waitTimers);
    }

    return await this.handleSuccessfulSession(context, result);
  }

  /**
   * Checks hide conditions and cancels content if necessary
   */
  private async checkHideConditions(
    context: ContentStartContext,
    session: CustomContentSession,
  ): Promise<boolean> {
    const { socket, server, contentType } = context;
    const socketClientData = await this.getSocketClientData(socket);
    if (!socketClientData) {
      return true;
    }
    const sessionId = session.id;
    const evaluatedVersions = await this.getEvaluatedContentVersions(
      socketClientData,
      contentType,
      session.version.id,
    );
    const sessionVersion = evaluatedVersions?.[0];

    if (!sessionVersion || isActivedHideRules(sessionVersion)) {
      this.logger.debug(
        `Hide rules are activated, canceling session, sessionVersion: ${sessionVersion?.content.name}, sessionId: ${sessionId}`,
      );
      // Cleanup socket session
      return await this.cancelSocketSession({
        server,
        socket,
        socketClientData,
        sessionId,
      });
    }

    return true;
  }

  /**
   * Handles tracking conditions when no content was found to start
   */
  private async handleTrackingConditions(
    context: ContentStartContext,
    trackConditions: TrackCondition[],
  ): Promise<boolean> {
    const { socket } = context;

    const trackedConditions = await this.socketParallelService.trackClientConditions(
      socket,
      trackConditions,
    );

    // Update socket data with successfully tracked conditions
    if (trackedConditions.length > 0) {
      return await this.updateSocketClientData(socket, {
        clientConditions: trackedConditions,
      });
    }

    return true;
  }

  /**
   * Handles condition wait timers for future content activation
   */
  private async handleConditionWaitTimers(
    context: ContentStartContext,
    waitTimers: ConditionWaitTimer[],
  ): Promise<boolean> {
    const { socket, socketClientData } = context;
    const { waitTimers: existingTimers = [] } = socketClientData;

    const newWaitTimers = waitTimers?.filter(
      (waitTimer) =>
        !existingTimers.some((existingTimer) => existingTimer.versionId === waitTimer.versionId),
    );

    const startedTimers = await this.socketParallelService.startConditionWaitTimers(
      socket,
      newWaitTimers,
    );

    // Update socket data with successfully started timers
    if (startedTimers.length > 0) {
      return await this.updateSocketClientData(socket, {
        waitTimers: [...existingTimers, ...startedTimers],
      });
    }

    return true;
  }

  /**
   * Handles successful session creation and setup
   */
  private async handleSuccessfulSession(
    context: ContentStartContext,
    result: ContentStartResult,
  ): Promise<boolean> {
    const { server, socketClientData, socket } = context;
    const { environment, externalUserId } = socketClientData;
    const {
      session,
      postTracks,
      forceGoToStep = false,
      isActivateOtherSockets = true,
      activate = true,
    } = result;
    const roomId = buildExternalUserRoomId(environment.id, externalUserId);
    const activateSessionParams = {
      server,
      socket,
      session,
      socketClientData,
      postTracks,
      forceGoToStep,
    };

    if (!session) {
      return false;
    }

    if (activate) {
      if (!(await this.activateSocketSession(activateSessionParams))) {
        return false;
      }
      if (isActivateOtherSockets) {
        await this.activateOtherSocketsInRoom(roomId, activateSessionParams);
      }
    }
    // Check hide conditions and cancel content if necessary
    return await this.checkHideConditions(context, session);
  }

  /**
   * Strategy 1: Try to start content by specific contentId
   */
  private async tryStartByContentId(context: ContentStartContext): Promise<ContentStartResult> {
    const { contentType, options, socketClientData } = context;
    const { contentId } = options!;
    const { environment } = socketClientData;

    try {
      // Get published version ID for the specific content
      const publishedVersionId = await this.dataResolverService.findPublishedContentVersionId(
        contentId,
        environment.id,
      );
      if (!publishedVersionId) {
        return {
          success: false,
          reason: 'Content not found or not published',
        };
      }
      const evaluatedContentVersions = await this.getEvaluatedContentVersions(
        socketClientData,
        contentType,
        publishedVersionId,
      );
      const evaluatedContentVersion = evaluatedContentVersions?.[0];
      if (!evaluatedContentVersion) {
        return {
          success: false,
          reason: 'Content version not available or not activated',
        };
      }
      const latestActivatedContentVersion = await this.findAndUpdateActivatedCustomContentVersion(
        socketClientData,
        contentType,
        evaluatedContentVersion,
      );

      return await this.handleContentVersion(
        context,
        latestActivatedContentVersion,
        true, // createNewSession
      );
    } catch (error) {
      this.logger.error(`Error in tryStartByContentId: ${error.message}`);
      return {
        success: false,
        reason: `Error starting by contentId: ${error.message}`,
      };
    }
  }

  /**
   * Strategy 2: Handle existing session validation
   */
  private async handleExistingSession(context: ContentStartContext): Promise<ContentStartResult> {
    const { contentType, socketClientData } = context;

    const session = extractSessionByContentType(socketClientData, contentType);
    if (!session) {
      return { success: false, reason: 'No existing session' };
    }

    const customContentVersions = await this.getEvaluatedContentVersions(
      socketClientData,
      contentType,
      session.version.id,
    );
    const customContentVersion = customContentVersions?.[0];
    if (!customContentVersion) {
      return { success: false, reason: 'No custom content version found' };
    }

    // Rebuild session
    const rebuiltSession = await this.sessionBuilderService.rebuildContentSession(
      customContentVersion,
      session,
      socketClientData,
    );

    // Compare session to detect changes
    const isChanged = this.sessionBuilderService.compareContentSessions(session, rebuiltSession);

    // Handle active session cases
    return {
      success: true,
      activate: isChanged,
      reason: isChanged ? 'Existing active session with changes' : 'Existing active session',
      session: rebuiltSession,
    };
  }

  /**
   * Find the latest activated content version, potentially updated by latest session version
   */
  private async findAndUpdateActivatedCustomContentVersion(
    socketClientData: SocketClientData,
    contentType: ContentDataType,
    evaluatedContentVersion: CustomContentVersion,
  ): Promise<CustomContentVersion> {
    if (!sessionIsAvailable(evaluatedContentVersion.session.latestSession, contentType)) {
      return evaluatedContentVersion;
    }
    const latestActivatedContentVersionId =
      evaluatedContentVersion.session.latestSession?.versionId;
    if (
      latestActivatedContentVersionId &&
      evaluatedContentVersion.id !== latestActivatedContentVersionId
    ) {
      const activatedContentVersions = await this.getEvaluatedContentVersions(
        socketClientData,
        contentType,
        latestActivatedContentVersionId,
      );
      const activatedContentVersion = activatedContentVersions?.[0];
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
    const { contentType, socketClientData } = context;
    const { clientConditions } = socketClientData;

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
      socketClientData,
      contentType,
      latestActivatedContentVersion,
    );

    const result = await this.handleContentVersion(
      context,
      customContentVersion,
      false, // don't create new session
    );

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
    const { contentType, socketClientData } = context;
    const { waitTimers } = socketClientData;
    const { clientConditions } = socketClientData;
    const firedWaitTimerVersionIds = waitTimers
      ?.filter((waitTimer) => waitTimer.activated)
      .map((waitTimer) => waitTimer.versionId);

    const autoStartContentVersions = filterAvailableAutoStartContentVersions(
      evaluatedContentVersions,
      contentType,
      clientConditions,
      true,
      firedWaitTimerVersionIds,
    );
    const autoStartContentVersion = autoStartContentVersions?.[0];

    if (!autoStartContentVersion) {
      return {
        success: false,
        reason: 'No auto-start content version available',
      };
    }

    const result = await this.handleContentVersion(
      context,
      autoStartContentVersion,
      true, // create new session for auto-start
    );

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
      false,
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
   * Create a new business session
   */
  private async createBizSession(
    customContentVersion: CustomContentVersion,
    clientData: SocketClientData,
    startOptions?: StartContentOptions,
  ): Promise<ContentStartResult & { sessionId?: string; currentStepCvid?: string }> {
    const { environment, externalUserId, externalCompanyId, clientContext } = clientData;
    const stepCvid = startOptions?.stepCvid;
    const startReason = startOptions?.startReason;
    const versionId = customContentVersion.id;
    const steps = customContentVersion.steps;
    const currentStepCvid = stepCvid || steps?.[0]?.cvid;
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
    const stepId = steps.find((step) => step.cvid === currentStepCvid)?.id;

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
   * Find existing session
   */
  private findExistingSession(
    customContentVersion: CustomContentVersion,
    startOptions?: StartContentOptions,
  ): ContentStartResult & { sessionId?: string; currentStepCvid?: string } {
    const session = customContentVersion.session;
    const contentType = customContentVersion.content.type as ContentDataType;
    const { stepCvid, contentId } = startOptions ?? {};
    const sessionId = findAvailableSessionId(session.latestSession, contentType);
    const firstStepCvid = customContentVersion.steps[0]?.cvid;
    const currentStepCvid =
      stepCvid ||
      (contentId && firstStepCvid) ||
      findLatestStepCvid(session.latestSession?.bizEvent);

    if (!sessionId) {
      return {
        success: false,
        reason: 'No available session found',
      };
    }

    return {
      success: true,
      sessionId,
      currentStepCvid,
    };
  }

  /**
   * Handles content version validation, session initialization and tracking conditions setup
   */
  private async handleContentVersion(
    context: ContentStartContext,
    customContentVersion: CustomContentVersion,
    createNewSession = false,
  ): Promise<ContentStartResult> {
    const { options, socketClientData } = context;

    try {
      // Handle session initialization
      const sessionResult = await this.initializeSession(
        customContentVersion,
        socketClientData,
        options,
        createNewSession,
      );

      if (!sessionResult.success) {
        return sessionResult;
      }

      // Extract tracking conditions for hide conditions
      const hideConditions = extractClientTrackConditions(
        [customContentVersion],
        ConditionExtractionMode.HIDE_ONLY,
      );
      // Extract tracking conditions for checklist conditions
      const checklistConditions = extractChecklistTrackConditions(customContentVersion);
      const postTracks = [...hideConditions, ...checklistConditions];

      return {
        success: true,
        session: sessionResult.session,
        postTracks,
        reason: 'Content session created successfully',
      };
    } catch (error) {
      return {
        success: false,
        reason: `Error initializing content version: ${error.message}`,
      };
    }
  }

  /**
   * Initializes a session for the content version
   */
  private async initializeSession(
    customContentVersion: CustomContentVersion,
    socketClientData: SocketClientData,
    options?: StartContentOptions,
    createNewSession = false,
  ): Promise<{ success: boolean; session?: CustomContentSession; reason?: string }> {
    const sessionResult = createNewSession
      ? await this.createBizSession(customContentVersion, socketClientData, options)
      : this.findExistingSession(customContentVersion, options);

    if (!sessionResult.success) {
      return sessionResult;
    }

    // Create content session
    const contentSession = await this.sessionBuilderService.createContentSession(
      sessionResult.sessionId!,
      customContentVersion,
      socketClientData,
      sessionResult.currentStepCvid!,
    );

    if (!contentSession) {
      return {
        success: false,
        reason: 'Failed to create content session',
      };
    }

    return {
      success: true,
      session: contentSession,
    };
  }

  /**
   * Get evaluated content versions
   */
  private async getEvaluatedContentVersions(
    socketClientData: SocketClientData,
    contentType: ContentDataType,
    versionId?: string,
  ): Promise<CustomContentVersion[]> {
    const { environment, externalUserId, externalCompanyId, clientContext } = socketClientData;

    const { clientConditions } = socketClientData;

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
   * Initialize content session by session ID
   * @param sessionId - The session ID
   * @returns The content session or null if not found
   */
  async initializeSessionById(
    socketClientData: SocketClientData,
    sessionId: string,
  ): Promise<CustomContentSession | null> {
    const session = await this.sessionBuilderService.getBizSessionWithContentAndVersion(sessionId);
    if (!session) {
      return null;
    }
    const contentType = session.content.type as ContentDataType;
    const customContentVersions = await this.getEvaluatedContentVersions(
      socketClientData,
      contentType,
      session.versionId,
    );
    const customContentVersion = customContentVersions?.[0];
    if (!customContentVersion || customContentVersion.session.latestSession.id !== sessionId) {
      return null;
    }
    const sessionResult = await this.initializeSession(
      customContentVersion,
      socketClientData,
      undefined,
      false,
    );
    return sessionResult.session;
  }
}
