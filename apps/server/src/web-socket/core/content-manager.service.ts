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
  StartContentOptions,
  TrackCondition,
  SDKContentSession,
  ConditionWaitTimer,
  ClientCondition,
} from '@/common/types/sdk';
import { CustomContentVersion } from '@/common/types/content';
import { ContentDataService } from './content-data.service';
import { SessionDataService } from './session-data.service';
import { EventTrackingService } from './event-tracking.service';
import { SessionManagerService } from './session-manager.service';
import { ConditionTrackingService } from './condition-tracking.service';
import { ConditionTimerService } from './condition-timer.service';
import { SocketClientData, SocketDataService } from './socket-data.service';
import { SocketEmitterService } from './socket-emitter.service';
import { buildExternalUserRoomId } from '@/utils/websocket-utils';

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
    private readonly socketEmitterService: SocketEmitterService,
    private readonly socketDataService: SocketDataService,
  ) {}

  /**
   * Handles the result of content start operations
   * Processes ContentStartResult and performs necessary WebSocket operations
   */
  private async handleContentStartResult(
    context: ContentStartContext,
    result: ContentStartResult,
    forceGoToStep = false,
  ): Promise<boolean> {
    const { success, session, trackHideConditions, reason, trackConditions, conditionWaitTimers } =
      result;

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
        session,
        trackHideConditions,
        forceGoToStep,
        reason,
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
   * Process session for a single socket
   */
  private async handleSocketSession(
    socket: Socket,
    session: SDKContentSession,
    trackHideConditions: TrackCondition[] | undefined,
    forceGoToStep: boolean,
  ): Promise<boolean> {
    const socketClientData = await this.socketDataService.getClientData(socket.id);
    if (!socketClientData) {
      return false;
    }
    const { clientConditions, conditionWaitTimers } = socketClientData;

    const isSetSession = await this.sessionManagerService.setCurrentSession(socket, session);
    if (!isSetSession) {
      return false;
    }

    if (forceGoToStep) {
      this.socketEmitterService.forceGoToStep(socket, session.id, session.currentStep?.cvid!);
    }

    // Untrack current conditions
    await this.conditionTrackingService.untrackClientConditions(socket, clientConditions);

    // Cancel wait timer conditions that are not the current session
    const cancelConditionWaitTimers = conditionWaitTimers.filter(
      (conditionWaitTimer) => conditionWaitTimer.versionId !== session.version.id,
    );
    await this.conditionTimerService.cancelConditionWaitTimers(socket, cancelConditionWaitTimers);

    // Track the hide conditions
    if (trackHideConditions && trackHideConditions.length > 0) {
      await this.conditionTrackingService.trackClientConditions(socket, trackHideConditions);
    }

    return true;
  }

  /**
   * Handles successful session creation and setup
   */
  private async handleSuccessfulSession(
    context: ContentStartContext,
    session: SDKContentSession,
    trackHideConditions: TrackCondition[] | undefined,
    forceGoToStep: boolean,
    reason: string | undefined,
  ): Promise<boolean> {
    const { server, socketClientData } = context;
    const { environment, externalUserId } = socketClientData;
    const room = buildExternalUserRoomId(environment.id, externalUserId);
    const sockets = await server.in(room).fetchSockets();
    for (const socket of sockets) {
      await this.handleSocketSession(
        socket as unknown as Socket,
        session,
        trackHideConditions,
        forceGoToStep,
      );
    }
    this.logger.debug(`Content start succeeded: ${reason}`);
    return true;
  }

  /**
   * Handles invalid session cleanup
   * Cleans up invalid session state and tracking conditions
   */
  private async handleInvalidSession(
    context: ContentStartContext,
    invalidSession: SDKContentSession,
  ): Promise<boolean> {
    const { socket, contentType, socketClientData } = context;
    const { clientConditions } = socketClientData;

    const isUnsetSession = await this.sessionManagerService.unsetCurrentSession(
      socket,
      socketClientData,
      contentType,
      invalidSession.id,
    );
    if (!isUnsetSession) {
      return false;
    }
    return await this.conditionTrackingService.untrackClientConditions(socket, clientConditions);
  }

  /**
   * Main entry point for starting singleton content
   * Implements multiple strategies for content activation and coordinates the start process
   */
  async startSingletonContent(context: ContentStartContext): Promise<boolean> {
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
        const isSuccess = await this.handleInvalidSession(
          context,
          existingSessionResult.invalidSession,
        );
        if (!isSuccess) {
          return false;
        }
        const newSocketClientData = await this.socketDataService.getClientData(context.socket.id);
        if (!newSocketClientData) {
          return false;
        }
        context.socketClientData = newSocketClientData;
      }

      // Get evaluated content versions for remaining strategies
      const evaluatedContentVersions = await this.getEvaluatedContentVersions(
        socketClientData,
        contentType,
      );

      // Strategy 3: Try to start by latest activated content version
      const latestVersionResult = await this.tryStartByLatestActivatedContentVersion(
        context,
        evaluatedContentVersions,
      );
      if (latestVersionResult.success) {
        return await this.handleContentStartResult(context, latestVersionResult);
      }

      // Strategy 4: Try to start by auto start conditions
      const autoStartResult = await this.tryStartByAutoStartConditions(
        context,
        evaluatedContentVersions,
      );
      if (autoStartResult.success) {
        return await this.handleContentStartResult(context, autoStartResult);
      }

      // Strategy 5: Setup tracking conditions for future activation
      const trackingResult = await this.setupTrackingConditions(context, evaluatedContentVersions);

      return await this.handleContentStartResult(context, trackingResult);
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

    const session = await this.sessionManagerService.getCurrentSession(
      socketClientData,
      contentType,
    );
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
    if (isActive) {
      if (isSessionChanged) {
        return {
          success: true,
          reason: 'Existing active session with changes',
          session: refreshedSession,
        };
      }
      return {
        success: true,
        reason: 'Existing active session',
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
    const { contentType } = context;

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
   * Strategy 5: Setup tracking conditions for future activation
   */
  private async setupTrackingConditions(
    context: ContentStartContext,
    evaluatedContentVersions: CustomContentVersion[],
  ): Promise<ContentStartResult> {
    const { contentType } = context;

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
        trackConditions: [],
        conditionWaitTimers,
        reason: 'Setup wait timer conditions for future activation',
      };
    }

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
        conditionWaitTimers: [],
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
    const { stepCvid } = startOptions;
    const sessionId = findAvailableSessionId(session.latestSession, contentType);
    const currentStepCvid = stepCvid || findLatestStepCvid(session.latestSession?.bizEvent);

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
