import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ContentDataType, RulesType } from '@usertour/types';
import {
  filterActivatedContentWithoutClientConditions,
  findLatestActivatedCustomContentVersion,
  filterAvailableAutoStartContentVersions,
  isActivedHideRules,
  extractClientTrackConditions,
  ConditionExtractionMode,
  evaluateCustomContentVersion,
  findAvailableSessionId,
  findLatestStepCvid,
  extractClientConditionWaitTimers,
} from '@/utils/content-utils';
import {
  buildExternalUserRoomId,
  extractContentTypeBySessionId,
  extractSessionByContentType,
  extractExcludedContentIds,
} from '@/utils/websocket-utils';
import {
  StartContentOptions,
  TrackCondition,
  SDKContentSession,
  ConditionWaitTimer,
  ClientCondition,
  SocketClientData,
  CustomContentVersion,
} from '@/common/types';
import { ContentDataService } from './content-data.service';
import { SessionDataService } from './session-data.service';
import { EventTrackingService } from './event-tracking.service';
import { SessionManagerService } from './session-manager.service';
import { ConditionTrackingService } from './condition-tracking.service';
import { ConditionTimerService } from './condition-timer.service';
import { SocketDataService } from './socket-data.service';

interface ContentStartContext {
  server: Server;
  socket: Socket;
  contentType: ContentDataType;
  socketClientData: SocketClientData;
  options?: StartContentOptions;
}

interface ContentStartResult {
  success: boolean;
  session?: SDKContentSession;
  trackConditions?: TrackCondition[];
  trackHideConditions?: TrackCondition[];
  conditionWaitTimers?: ConditionWaitTimer[];
  reason?: string;
  invalidSession?: SDKContentSession;
}

interface CancelSessionParams {
  server: Server;
  socket: Socket;
  socketClientData: SocketClientData;
  sessionId: string;
}

interface ActivateSessionParams {
  server: Server;
  socket: Socket;
  socketClientData?: SocketClientData;
  session: SDKContentSession;
  trackHideConditions: TrackCondition[] | undefined;
  forceGoToStep: boolean;
}

/**
 * Service responsible for managing content (flows, checklists) with various strategies
 */
@Injectable()
export class ContentManagerService {
  private readonly logger = new Logger(ContentManagerService.name);

  constructor(
    private readonly contentDataService: ContentDataService,
    private readonly sessionDataService: SessionDataService,
    private readonly eventTrackingService: EventTrackingService,
    private readonly sessionManagerService: SessionManagerService,
    private readonly conditionTrackingService: ConditionTrackingService,
    private readonly conditionTimerService: ConditionTimerService,
    private readonly socketDataService: SocketDataService,
  ) {}

  /**
   * Main entry point for starting singleton content
   * Implements multiple strategies for content activation and coordinates the start process
   */
  async startContent(context: ContentStartContext): Promise<boolean> {
    const { contentType, options, socketClientData } = context;
    const { contentId } = options ?? {};

    try {
      // Strategy 1: Try to start by specific contentId
      if (contentId) {
        const result = await this.tryStartByContentId(context);
        if (result.success) {
          return await this.handleContentStartResult(context, result, true);
        }
      }

      // Strategy 2: Handle existing session
      const existingSessionResult = await this.handleExistingSession(context);
      if (existingSessionResult.success) {
        return await this.handleContentStartResult(context, existingSessionResult);
      }

      if (existingSessionResult.invalidSession) {
        return await this.cancelContent(
          context.server,
          context.socket,
          existingSessionResult.invalidSession.id,
        );
      }

      // Extract excluded content IDs based on current content type
      const excludeContentIds = extractExcludedContentIds(socketClientData, contentType);
      // Execute content start strategies and handle the result
      const strategyResult = await this.executeContentStartStrategies(
        context,
        socketClientData,
        contentType,
        excludeContentIds,
      );
      return await this.handleContentStartResult(context, strategyResult);
    } catch (error) {
      this.logger.error(`Failed to start singleton content: ${error.message}`, {
        contentType,
        options,
        stack: error.stack,
      });

      return false;
    }
  }

  /**
   * Cancel content
   * @param server - The server instance
   * @param socket - The socket instance
   * @param sessionId - The session id
   * @param cancelOtherSessions - Whether to cancel other sessions in room
   * @returns True if the content was canceled successfully
   */
  async cancelContent(
    server: Server,
    socket: Socket,
    sessionId: string,
    cancelOtherSessions = true,
  ) {
    const socketClientData = await this.socketDataService.getClientData(socket.id);
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
    };

    // Cleanup socket session
    await this.cancelSocketSession(cancelSessionParams);

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
    // Execute content start strategies and handle the result
    const strategyResult = await this.executeContentStartStrategies(
      context,
      socketClientData,
      contentType,
      excludeContentIds,
    );

    // If the strategy result is successful and the session is not null, return the strategy result
    if (strategyResult.success && strategyResult.session) {
      return await this.handleContentStartResult(context, strategyResult, false, false);
    }

    // Cleanup current session if exists
    const cleanupResult = await this.cleanupCurrentSessionIfNeeded(
      currentSession,
      socket,
      socketClientData,
      sessionId,
    );
    if (!cleanupResult.success) {
      return false;
    }

    // Update context with fresh client data if session was cleaned
    if (cleanupResult.updatedClientData) {
      context.socketClientData = cleanupResult.updatedClientData;
    }

    return await this.handleContentStartResult(context, strategyResult, false, false);
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
    currentSession: SDKContentSession | null,
    socket: Socket,
    socketClientData: SocketClientData,
    sessionId: string,
  ): Promise<{ success: boolean; updatedClientData?: SocketClientData }> {
    if (!currentSession) {
      return { success: true };
    }

    const isCleaned = await this.sessionManagerService.cleanupSocketSession(
      socket,
      socketClientData,
      sessionId,
    );

    if (!isCleaned) {
      return { success: false };
    }

    const updatedClientData = await this.socketDataService.getClientData(socket.id);
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
    const socketClientData = await this.socketDataService.getClientData(socket.id);
    if (!socketClientData) {
      return false;
    }
    return await this.cancelSocketSession({
      ...params,
      socketClientData,
    });
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
    const { socket, session, trackHideConditions, forceGoToStep, socketClientData } = params;
    if (!socketClientData) {
      return false;
    }
    return await this.sessionManagerService.activateSocketSession(
      socket as unknown as Socket,
      socketClientData,
      session,
      trackHideConditions,
      forceGoToStep,
    );
  }

  /**
   * Activate other socket session
   * @param params - The activate session parameters
   * @returns True if the session was activated successfully
   */
  private async activateOtherSocketSession(params: ActivateSessionParams) {
    const { socket, session } = params;
    const socketClientData = await this.socketDataService.getClientData(socket.id);
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
   * Execute content start strategies (strategies 3-6) and return the result
   */
  private async executeContentStartStrategies(
    context: ContentStartContext,
    socketClientData: SocketClientData,
    contentType: ContentDataType,
    excludeContentIds: string[] = [],
  ): Promise<ContentStartResult> {
    // Get evaluated content versions for remaining strategies
    const evaluatedContentVersions = await this.getEvaluatedContentVersions(
      socketClientData,
      contentType,
    );

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
    if (latestVersionResult.success) {
      return latestVersionResult;
    }

    // Strategy 4: Try to start by auto start conditions
    const autoStartResult = await this.tryStartByAutoStartConditions(
      context,
      filteredContentVersions,
    );
    if (autoStartResult.success) {
      return autoStartResult;
    }

    // Strategy 5: Setup wait timer conditions for future activation
    const waitTimerResult = this.prepareConditionWaitTimersResult(
      filteredContentVersions,
      contentType,
    );
    if (waitTimerResult.success) {
      return waitTimerResult;
    }

    // Strategy 6: Setup tracking conditions for future activation
    return await this.setupTrackingConditions(contentType, filteredContentVersions);
  }

  /**
   * Handles the result of content start operations
   * Processes ContentStartResult and performs necessary WebSocket operations
   */
  private async handleContentStartResult(
    context: ContentStartContext,
    result: ContentStartResult,
    forceGoToStep = false,
    isActivateOtherSockets = true,
  ): Promise<boolean> {
    const { success, session, trackConditions, conditionWaitTimers, reason } = result;

    // Early return if operation failed
    if (!success) {
      this.logger.debug(`Content start failed: ${reason}`);
      return false;
    }

    // Handle tracking conditions
    if (trackConditions && trackConditions.length > 0) {
      return await this.handleTrackingConditions(context, trackConditions);
    }

    // Handle condition wait timers
    if (conditionWaitTimers && conditionWaitTimers.length > 0) {
      return await this.handleConditionWaitTimers(context, conditionWaitTimers);
    }

    // Handle successful session creation
    if (session) {
      return await this.handleSuccessfulSession(
        context,
        result,
        forceGoToStep,
        isActivateOtherSockets,
      );
    }

    return false;
  }

  /**
   * Handles tracking conditions when no content was found to start
   */
  private async handleTrackingConditions(
    context: ContentStartContext,
    trackConditions: TrackCondition[],
  ): Promise<boolean> {
    const { socket, socketClientData } = context;

    this.logger.debug(`Tracking conditions: ${trackConditions.length}`);
    // Track the client conditions, because no content was found to start
    const newTrackConditions = trackConditions?.filter(
      (trackCondition) =>
        !socketClientData?.clientConditions?.some(
          (clientCondition) => clientCondition.conditionId === trackCondition.condition.id,
        ),
    );
    return await this.conditionTrackingService.trackClientConditions(socket, newTrackConditions);
  }

  /**
   * Handles condition wait timers for future content activation
   */
  private async handleConditionWaitTimers(
    context: ContentStartContext,
    conditionWaitTimers: ConditionWaitTimer[],
  ): Promise<boolean> {
    const { socket, socketClientData } = context;

    this.logger.debug(`Starting wait timer conditions: ${conditionWaitTimers.length}`);
    const newConditionWaitTimers = conditionWaitTimers?.filter(
      (conditionWaitTimer) =>
        !socketClientData?.conditionWaitTimers?.some(
          (waitTimer) => waitTimer.versionId === conditionWaitTimer.versionId,
        ),
    );
    return await this.conditionTimerService.startConditionWaitTimers(
      socket,
      newConditionWaitTimers,
    );
  }

  /**
   * Handles successful session creation and setup
   */
  private async handleSuccessfulSession(
    context: ContentStartContext,
    result: ContentStartResult,
    forceGoToStep: boolean,
    isActivateOtherSockets = true,
  ): Promise<boolean> {
    const { server, socketClientData, socket } = context;
    const { environment, externalUserId } = socketClientData;
    const { session, trackHideConditions, reason } = result;

    const activateSessionParams: ActivateSessionParams = {
      server,
      socket,
      session,
      socketClientData,
      trackHideConditions,
      forceGoToStep,
    };

    const isActivated = await this.activateSocketSession(activateSessionParams);
    if (!isActivated) {
      return false;
    }
    this.logger.debug(`Content start succeeded: ${reason}`);

    const roomId = buildExternalUserRoomId(environment.id, externalUserId);
    if (isActivateOtherSockets) {
      await this.activateOtherSocketsInRoom(roomId, activateSessionParams);
    }
    return isActivated;
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
      const publishedVersionId = await this.contentDataService.findPublishedContentVersionId(
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

      if (evaluatedContentVersions.length > 0) {
        const latestVersionResult = await this.tryStartByLatestActivatedContentVersion(
          context,
          evaluatedContentVersions,
        );
        if (latestVersionResult.success) {
          return latestVersionResult;
        }

        const result = await this.processContentVersion(
          context,
          evaluatedContentVersions[0],
          true, // createNewSession
        );

        if (result.success) {
          return {
            ...result,
            reason: 'Started by contentId',
          };
        }
      }

      return {
        success: false,
        reason: 'Content version not available or not activated',
      };
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
    const { environment, externalUserId, externalCompanyId } = socketClientData;

    const session = extractSessionByContentType(socketClientData, contentType);
    if (!session) {
      return { success: false, reason: 'No existing session' };
    }
    // Refresh session
    const refreshedSession = await this.sessionDataService.refreshContentSession(
      session,
      environment,
      externalUserId,
      externalCompanyId,
    );

    // Compare session to detect changes
    const isSessionChanged = this.sessionDataService.compareContentSessions(
      session,
      refreshedSession,
    );
    const isActive = await this.isSessionActive(socketClientData, contentType, session);

    // Handle active session cases
    if (isActive) {
      return {
        success: true,
        reason: isSessionChanged
          ? 'Existing active session with changes'
          : 'Existing active session',
        ...(isSessionChanged && { session: refreshedSession }),
      };
    }

    // Return information about invalid session that needs cleanup
    return {
      success: false,
      reason: 'Existing session was invalid and needs cleanup',
      invalidSession: session,
    };
  }

  /**
   * Strategy 3: Try to start by latest activated content version
   */
  private async tryStartByLatestActivatedContentVersion(
    context: ContentStartContext,
    evaluatedContentVersions: CustomContentVersion[],
  ): Promise<ContentStartResult> {
    const { contentType, socketClientData } = context;

    const latestActivatedContentVersion = findLatestActivatedCustomContentVersion(
      evaluatedContentVersions,
      contentType as ContentDataType.CHECKLIST | ContentDataType.FLOW,
    );

    if (!latestActivatedContentVersion) {
      return {
        success: false,
        reason: 'No latest activated content version found',
      };
    }

    //Get latest activated content version by latest session version id if it exists
    const latestActivatedContentVersionId =
      latestActivatedContentVersion.session.latestSession?.versionId;
    if (
      latestActivatedContentVersionId &&
      latestActivatedContentVersion.id !== latestActivatedContentVersionId
    ) {
      const latestActivatedContentVersions = await this.getEvaluatedContentVersions(
        socketClientData,
        contentType,
        latestActivatedContentVersionId,
      );
      if (latestActivatedContentVersions.length > 0) {
        const result = await this.processContentVersion(
          context,
          latestActivatedContentVersions[0],
          false, // don't create new session
        );
        return {
          ...result,
          reason: result.success ? 'Started by latest activated version' : result.reason,
        };
      }
    }

    const result = await this.processContentVersion(
      context,
      latestActivatedContentVersion,
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
    const { conditionWaitTimers } = socketClientData;
    const firedWaitTimerVersionIds = conditionWaitTimers
      ?.filter((conditionWaitTimer) => conditionWaitTimer.activated)
      .map((conditionWaitTimer) => conditionWaitTimer.versionId);

    const autoStartContentVersions = filterAvailableAutoStartContentVersions(
      evaluatedContentVersions,
      contentType,
      true,
      firedWaitTimerVersionIds,
    );

    if (!autoStartContentVersions || autoStartContentVersions.length === 0) {
      return {
        success: false,
        reason: 'No auto-start content version available',
      };
    }
    const autoStartContentVersion = autoStartContentVersions[0];

    const result = await this.processContentVersion(
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
  ): ContentStartResult {
    const autoStartContentVersionsWithoutWaitTimer = filterAvailableAutoStartContentVersions(
      evaluatedContentVersions,
      contentType,
      false,
    );

    const conditionWaitTimers = extractClientConditionWaitTimers(
      autoStartContentVersionsWithoutWaitTimer,
    );

    if (conditionWaitTimers.length > 0) {
      return {
        success: true,
        conditionWaitTimers,
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
  private async setupTrackingConditions(
    contentType: ContentDataType,
    evaluatedContentVersions: CustomContentVersion[],
  ): Promise<ContentStartResult> {
    const trackCustomContentVersions: CustomContentVersion[] =
      filterActivatedContentWithoutClientConditions(evaluatedContentVersions, contentType);

    const trackConditions = extractClientTrackConditions(
      trackCustomContentVersions,
      ConditionExtractionMode.BOTH,
    );

    if (trackConditions.length > 0) {
      // This would need to be implemented in the calling service
      // as it involves WebSocket-specific operations
      return {
        success: true,
        trackConditions,
        reason: 'Setup tracking conditions for future activation',
      };
    }

    return {
      success: true,
      reason: 'No content available for activation or tracking',
    };
  }

  /**
   * Validate content version before processing
   */
  private validateContentVersion(customContentVersion: CustomContentVersion): ContentStartResult {
    if (isActivedHideRules(customContentVersion)) {
      return {
        success: false,
        reason: 'Content is hidden by rules',
      };
    }

    return { success: true };
  }

  /**
   * Handle session management (create new or find existing)
   */
  private async handleSessionManagement(
    customContentVersion: CustomContentVersion,
    clientData: SocketClientData,
    startOptions: StartContentOptions,
    createNewSession = false,
  ): Promise<ContentStartResult & { sessionId?: string; currentStepCvid?: string }> {
    if (createNewSession) {
      return await this.createNewSession(customContentVersion, clientData, startOptions);
    }

    return this.findExistingSession(customContentVersion, startOptions);
  }

  /**
   * Create a new business session
   */
  private async createNewSession(
    customContentVersion: CustomContentVersion,
    clientData: SocketClientData,
    startOptions: StartContentOptions,
  ): Promise<ContentStartResult & { sessionId?: string; currentStepCvid?: string }> {
    const { environment, externalUserId, externalCompanyId, clientContext } = clientData;
    const { stepCvid, startReason } = startOptions;
    const versionId = customContentVersion.id;
    const steps = customContentVersion.steps;
    const currentStepCvid = stepCvid || steps?.[0]?.cvid;
    const bizSession = await this.sessionDataService.createBizSession(
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

    await this.eventTrackingService.trackAutoStartEvent(
      customContentVersion,
      bizSession,
      environment,
      externalUserId,
      startReason,
      clientContext,
    );

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
    startOptions: StartContentOptions,
  ): ContentStartResult & { sessionId?: string; currentStepCvid?: string } {
    const session = customContentVersion.session;
    const contentType = customContentVersion.content.type as ContentDataType;
    const { stepCvid, contentId } = startOptions;
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
   * Create content session
   */
  private async createContentSession(
    sessionId: string,
    customContentVersion: CustomContentVersion,
    clientData: SocketClientData,
    stepCvid: string,
  ): Promise<SDKContentSession | null> {
    return await this.sessionDataService.createContentSession(
      sessionId,
      customContentVersion,
      clientData,
      stepCvid,
    );
  }

  /**
   * Process content version with common logic
   */
  private async processContentVersion(
    context: ContentStartContext,
    customContentVersion: CustomContentVersion,
    createNewSession = false,
  ): Promise<ContentStartResult> {
    // Early validation
    const validationResult = this.validateContentVersion(customContentVersion);
    if (!validationResult.success) {
      return validationResult;
    }

    const { options, socketClientData } = context;

    try {
      // Handle session management
      const sessionResult = await this.handleSessionManagement(
        customContentVersion,
        socketClientData,
        options,
        createNewSession,
      );

      if (!sessionResult.success) {
        return sessionResult;
      }

      // Create content session
      const contentSession = await this.createContentSession(
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

      // Update session version

      await this.contentDataService.updateSessionVersion(
        sessionResult.sessionId!,
        customContentVersion.id,
      );

      // Extract tracking conditions for hide conditions
      const trackHideConditions = extractClientTrackConditions(
        [customContentVersion],
        ConditionExtractionMode.HIDE_ONLY,
      );

      return {
        success: true,
        session: contentSession,
        trackHideConditions,
        reason: 'Content session created successfully',
      };
    } catch (error) {
      this.logger.error(`Error processing content version: ${error.message}`);
      return {
        success: false,
        reason: `Error processing content version: ${error.message}`,
      };
    }
  }

  /**
   * Get evaluated content versions
   */
  private async getEvaluatedContentVersions(
    socketClientData: SocketClientData,
    contentType: ContentDataType,
    versionId?: string,
  ): Promise<CustomContentVersion[]> {
    const { environment, clientConditions, externalUserId, externalCompanyId, clientContext } =
      socketClientData;

    // Extract activated and deactivated condition IDs
    const activatedIds = clientConditions
      ?.filter((clientCondition: ClientCondition) => clientCondition.isActive)
      .map((clientCondition: ClientCondition) => clientCondition.conditionId);

    const deactivatedIds = clientConditions
      ?.filter((clientCondition: ClientCondition) => !clientCondition.isActive)
      .map((clientCondition: ClientCondition) => clientCondition.conditionId);

    const contentVersions = await this.contentDataService.fetchCustomContentVersions(
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
   * Check if the existing session is still active
   */
  private async isSessionActive(
    socketClientData: SocketClientData,
    contentType: ContentDataType,
    session: SDKContentSession,
  ): Promise<boolean> {
    const sessionVersion = await this.getEvaluatedContentVersions(
      socketClientData,
      contentType,
      session.version.id,
    );

    return sessionVersion.length > 0 && !isActivedHideRules(sessionVersion[0]);
  }
}
