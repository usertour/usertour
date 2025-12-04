import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import {
  ContentDataType,
  contentStartReason,
  RulesType,
  BizEvents,
  ClientContext,
  StartContentOptions,
  CustomContentSession,
  ClientCondition,
} from '@usertour/types';
import {
  filterActivatedContentWithoutClientConditions,
  findLatestActivatedCustomContentVersions,
  filterAvailableAutoStartContentVersions,
  isActivedHideRules,
  extractClientTrackConditions,
  evaluateCustomContentVersion,
  extractClientConditionWaitTimers,
  sessionIsAvailable,
  extractChecklistNewCompletedItems,
  extractChecklistTrackConditions,
  hasContentSessionChanges,
  findCurrentStepCvid,
  canSendChecklistCompletedEvent,
  evaluateChecklistItemsWithContext,
  isSingletonContentType,
  sessionIsDismissed,
} from '@/utils/content-utils';
import {
  buildExternalUserRoomId,
  extractExcludedContentIds,
  extractSessionByContentType,
  buildSocketLockKey,
  extractSessionsByContentType,
} from '@/utils/websocket-utils';
import {
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
  EventTrackingItem,
} from '@/common/types';
import { DistributedLockService } from './distributed-lock.service';
import { ContentDataService } from './content-data.service';
import { SessionBuilderService } from './session-builder.service';
import { EventTrackingService } from './event-tracking.service';
import { SocketOperationService } from './socket-operation.service';
import { SocketDataService } from './socket-data.service';
import { getStartEventType, getEndEventType } from '@/utils/event-v2';
import { WebSocketContext } from '../v2/web-socket-v2.dto';

/**
 * Result of content data preparation
 */
interface ContentDataPreparationResult {
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
    private readonly contentDataService: ContentDataService,
    private readonly sessionBuilderService: SessionBuilderService,
    private readonly eventTrackingService: EventTrackingService,
    private readonly socketOperationService: SocketOperationService,
    private readonly socketDataService: SocketDataService,
    private readonly distributedLockService: DistributedLockService,
  ) {}

  // ============================================================================
  // Public API Methods - Singleton Content (FLOW and CHECKLIST)
  // ============================================================================

  /**
   * Main entry point for starting singleton content (FLOW and CHECKLIST)
   * Implements multiple strategies for content activation and coordinates the start process
   * No longer needs distributed lock as message queue ensures ordered execution
   */
  async startContent(context: ContentStartContext): Promise<boolean> {
    const { options, contentType } = context;
    const contentId = options?.contentId;

    // If the content type is not a singleton content type, return false
    if (!isSingletonContentType(contentType)) {
      return false;
    }
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
   * Cancel content (FLOW, CHECKLIST, or LAUNCHER)
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
    const bizSession = await this.contentDataService.findBizSession(sessionId);
    if (!socketData || !bizSession) {
      return false;
    }
    const { environment, clientContext, externalUserId } = socketData;

    const contentType = bizSession.content.type as ContentDataType;
    const contentId = bizSession.content.id;

    // Track content ended event (supports FLOW, CHECKLIST, LAUNCHER)
    const isEventTracked = await this.trackContentEndedEvent(
      sessionId,
      contentType,
      environment,
      clientContext,
      endReason,
    );

    if (!isEventTracked) {
      return false;
    }

    const roomId = buildExternalUserRoomId(environment.id, externalUserId);

    // Build cancel session parameters based on content type
    const cancelSessionParams: CancelSessionParams = {
      server,
      socket,
      socketData,
      sessionId,
      contentType,
      contentId,
    };

    // FLOW/CHECKLIST need setLastDismissedId to prevent immediate restart
    if (isSingletonContentType(contentType)) {
      cancelSessionParams.setLastDismissedId = true;
    }

    return await this.cancelSessionInRoom(
      cancelSessionParams,
      roomId,
      cancelOtherSessions,
      unsetCurrentSession,
    );
  }

  /**
   * Initialize content session by session ID
   * @param socketData - Socket data
   * @param sessionId - The session ID
   * @returns The content session or null if not found
   */
  async initializeSessionById(
    socketData: SocketData,
    sessionId: string,
  ): Promise<CustomContentSession | null> {
    const session = await this.contentDataService.findBizSession(sessionId);
    if (!session) {
      return null;
    }
    const contentType = session.content.type as ContentDataType;
    const customContentVersion = await this.findEvaluatedContentVersion(
      socketData,
      contentType,
      session.versionId,
    );

    if (!customContentVersion) {
      return null;
    }
    const activeSession = customContentVersion?.session?.activeSession;
    if (activeSession?.id !== sessionId) {
      const bizSession = await this.contentDataService.findBizSessionWithEvents(sessionId);
      customContentVersion.session.activeSession = bizSession;
    }
    return await this.initializeSession(customContentVersion, socketData, undefined);
  }

  // ============================================================================
  // Public API Methods - Multi-instance Content (LAUNCHER)
  // ============================================================================

  /**
   * Start content batch (for multi-instance content types like LAUNCHER)
   * Supports multiple concurrent sessions for the same content type
   * Note: Singleton content types (FLOW, CHECKLIST) should use startContent instead
   * @param context - The content start context
   * @returns True if the content batch was started successfully
   */
  async startContentBatch(context: ContentStartContext): Promise<boolean> {
    const { contentType } = context;
    // Validate that content type is not singleton
    if (isSingletonContentType(contentType)) {
      return false;
    }

    // Prepare, create, and execute in sequence
    const preparationResult = await this.prepareBatchData(context, contentType);
    if (!preparationResult.success) {
      return false;
    }

    const sessions = await this.createBatchSessions(
      preparationResult.availableVersions,
      context.socketData,
      preparationResult.startReason,
      preparationResult.versionId,
      contentType,
    );

    return await this.executeBatchOperations(
      context.socket,
      context.socketData,
      sessions,
      preparationResult.shouldTrackVersions,
      contentType,
    );
  }

  /**
   * Initialize session by content ID
   * @param socketData - Socket data
   * @param contentId - Content ID
   * @param contentType - The content type
   * @returns The initialized session or null if not found
   */
  async initializeSessionByContentId(
    socketData: SocketData,
    contentId: string,
    contentType: ContentDataType,
  ): Promise<CustomContentSession | null> {
    const { environment } = socketData;

    const versionId = await this.findPublishedVersionId(contentId, environment);
    if (!versionId) {
      return null;
    }
    const customContentVersion = await this.findEvaluatedContentVersion(
      socketData,
      contentType,
      versionId,
    );
    // If active session is not found, return null
    if (!customContentVersion?.session?.activeSession) {
      return null;
    }
    return await this.initializeSession(customContentVersion, socketData);
  }

  // ============================================================================
  // Public API Methods - Utility
  // ============================================================================

  /**
   * Toggle contents for the socket
   * This method will start content types specified by the caller, handling session cleanup and restart
   * @param context - The web socket context containing server, socket, and socket data
   * @param types - Optional array of content types to toggle. If not provided, uses all content types in order: CHECKLIST, FLOW, LAUNCHER
   * @returns True if the contents were toggled successfully
   */
  async toggleContents(context: WebSocketContext, types?: ContentDataType[]): Promise<boolean> {
    const { server, socket } = context;

    // Use default content types if not provided, maintaining the order: CHECKLIST, FLOW, LAUNCHER
    const contentTypes = types ?? [
      ContentDataType.CHECKLIST,
      ContentDataType.FLOW,
      ContentDataType.LAUNCHER,
    ];

    // Start content asynchronously without waiting for completion
    // This allows toggleContents to return immediately while startContent runs in background
    const startContext = {
      server,
      socket,
      options: {
        startReason: contentStartReason.START_FROM_CONDITION,
      },
    };

    // Handle checklist completed events
    if (contentTypes.some((type) => isSingletonContentType(type))) {
      await this.handleChecklistCompletedEvents(socket);
    }

    // Start content types sequentially
    // Gets socket data in each iteration to ensure we have the latest data
    // as it may be updated by previous content operations
    for (const contentType of contentTypes) {
      const startContentContext = await this.buildContentStartContext(startContext, contentType);
      if (!startContentContext) {
        return false;
      }

      if (isSingletonContentType(contentType)) {
        await this.startContent(startContentContext);
      } else {
        await this.startContentBatch(startContentContext);
      }
    }

    return true;
  }

  // ============================================================================
  // Private Helper Methods - Data Access
  // ============================================================================

  /**
   * Build content start context with fresh socket data
   * @param context - Base context containing server, socket, and options
   * @param contentType - The content type to start
   * @returns ContentStartContext if socket data is available, null otherwise
   */
  private async buildContentStartContext(
    context: Omit<ContentStartContext, 'contentType' | 'socketData'>,
    contentType: ContentDataType,
  ): Promise<ContentStartContext | null> {
    const socketData = await this.getSocketData(context.socket);
    if (!socketData) {
      return null;
    }

    return {
      ...context,
      socketData,
      contentType,
    };
  }

  /**
   * Get socket data from Redis
   * @param socket - The socket instance
   * @returns Promise<SocketData | null>
   */
  private async getSocketData(socket: Socket): Promise<SocketData | null> {
    return await this.socketDataService.get(socket.id);
  }

  /**
   * Find evaluated content versions
   */
  private async findEvaluatedContentVersions(
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

    // Pass contentType to filter at database level, reducing query data
    const contentVersions = await this.contentDataService.findCustomContentVersions(
      { environment, externalUserId, externalCompanyId },
      [contentType],
      versionId,
    );

    // Evaluate content versions with proper conditions
    return await evaluateCustomContentVersion(contentVersions, {
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
   * Find evaluated content version by version ID
   * This method is optimized for querying a single version by ID
   */
  private async findEvaluatedContentVersion(
    socketData: SocketData,
    contentType: ContentDataType,
    versionId: string,
  ): Promise<CustomContentVersion | null> {
    const evaluatedVersions = await this.findEvaluatedContentVersions(
      socketData,
      contentType,
      versionId,
    );
    return evaluatedVersions?.[0] || null;
  }

  /**
   * Find published version ID for specific content
   * @param contentId - The content ID to find version for
   * @param environment - The environment
   * @returns The published version ID or undefined if not found
   */
  private async findPublishedVersionId(
    contentId: string | undefined,
    environment: Environment,
  ): Promise<string | undefined> {
    if (!contentId) {
      return undefined;
    }

    const publishedVersionId = await this.contentDataService.findPublishedVersionId(
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

  // ============================================================================
  // Content Start Strategy Methods
  // ============================================================================

  /**
   * Strategy 1: Try to start content by specific contentId
   */
  private async tryStartByContentId(context: ContentStartContext): Promise<ContentStartResult> {
    const { contentType, options, socketData } = context;
    const { contentId } = options!;
    const { environment } = socketData;

    const publishedVersionId = await this.findPublishedVersionId(contentId, environment);
    if (!publishedVersionId) {
      return {
        success: false,
        reason: 'Content not found or not published',
      };
    }
    const evaluatedContentVersion = await this.findEvaluatedContentVersion(
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
    const latestActivatedContentVersion = await this.findAndUpdateCustomContentVersion(
      socketData,
      contentType,
      evaluatedContentVersion,
      true, // When versions don't match, use published version and clear activeSession
    );
    const steps = latestActivatedContentVersion?.steps ?? [];
    const stepCvid = options?.stepCvid || steps?.[0]?.cvid;
    const contentStartContext = {
      ...context,
      options: {
        ...options,
        stepCvid,
      },
    };

    return await this.handleContentVersion(contentStartContext, latestActivatedContentVersion);
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

    const customContentVersion = await this.findEvaluatedContentVersion(
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
   * Strategy 3: Try to auto start content
   */
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
    const evaluatedContentVersions = await this.findEvaluatedContentVersions(
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
   * Strategy 3.1: Try to start by latest activated content version
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

    const customContentVersion = await this.findAndUpdateCustomContentVersion(
      socketData,
      contentType,
      latestActivatedContentVersion,
      false, // When versions don't match, prefer to use active session version
    );

    const result = await this.handleContentVersion(context, customContentVersion);

    return {
      ...result,
      reason: result.success ? 'Started by latest activated version' : result.reason,
    };
  }

  /**
   * Strategy 3.2: Try to start by auto start conditions
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
   * Strategy 3.3: Prepare wait timer conditions result for future activation
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
   * Strategy 3.4: Setup tracking conditions for future activation
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
   * Handles the result of content start operations
   * Processes ContentStartResult and performs necessary WebSocket operations
   * @param context - The content start context
   * @param result - The content start result
   * @returns True if the operation was successful, false otherwise
   * @remarks
   * This method handles the following scenarios:
   * 1. If operation failed, returns false immediately
   * 2. If preTracks exist, handles tracking conditions
   * 3. If waitTimers exist, handles condition wait timers
   * 4. If session should be hidden (existing session with active hide rules), cancels the session
   * 5. Otherwise, activates the session first, then checks if cancellation is needed
   */
  private async handleContentStartResult(
    context: ContentStartContext,
    result: ContentStartResult,
  ): Promise<boolean> {
    const { success, preTracks, waitTimers, session, hideRulesActivated } = result;
    const { socket, contentType } = context;
    const socketData = await this.getSocketData(socket);

    // Early return if operation failed
    if (!success || !socketData) {
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

    // Determine if session should be hidden based on current state
    const currentSession = extractSessionByContentType(socketData, contentType);

    // If session should be hidden, cancel it directly
    if (currentSession?.id === session?.id && hideRulesActivated) {
      return await this.handleSessionCancellation({ ...context, socketData }, result);
    }

    // Otherwise, activate the session first
    const activationSuccess = await this.handleSessionActivation(context, result);
    if (!activationSuccess) {
      return false;
    }

    // After activation, check if cancellation is needed
    // This handles the case where activation changes the session state
    if (hideRulesActivated) {
      return await this.handleSessionCancellation({ ...context, socketData }, result);
    }

    return true;
  }

  // ============================================================================
  // Session Management Methods
  // ============================================================================

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
    const session = await this.sessionBuilderService.createContentSession(
      customContentVersion,
      socketData,
      sessionId,
      currentStepCvid,
    );

    if (!session) {
      return null;
    }

    // Sync session version ID if published version differs from custom version
    if (!skipBizSession) {
      await this.sessionBuilderService.syncSessionVersionIfNeeded(session, customContentVersion);
    }

    return session;
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
    const startReason = startOptions?.startReason ?? contentStartReason.START_FROM_CONDITION;
    const versionId = customContentVersion.id;

    const session = customContentVersion.session;
    const contentType = customContentVersion.content.type as ContentDataType;
    const currentStepCvid = findCurrentStepCvid(customContentVersion, startOptions);

    if (session.activeSession) {
      return {
        success: true,
        sessionId: session.activeSession.id,
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

    const result = await this.trackAutoStartEvent(
      bizSession.id,
      contentType,
      environment,
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

    // Check if hide rules are activated
    const hideRulesActivated = isActivedHideRules(customContentVersion);

    return {
      success: true,
      session,
      hideConditions,
      checklistConditions,
      hideRulesActivated,
      reason: 'Content session created successfully',
    };
  }

  /**
   * Find the latest activated content version, potentially updated by latest session version
   * @param usePublishedVersionOnMismatch - When activeSession version differs from published version:
   *                                        - If true: use the published version and set activeSession to null
   *                                        - If false: prefer to use the version from active session
   */
  private async findAndUpdateCustomContentVersion(
    socketData: SocketData,
    contentType: ContentDataType,
    evaluatedContentVersion: CustomContentVersion,
    usePublishedVersionOnMismatch: boolean,
  ): Promise<CustomContentVersion> {
    // For checklist, always return the evaluated content version (the new published version)
    const activeSession = evaluatedContentVersion.session.activeSession;
    if (!activeSession || contentType !== ContentDataType.FLOW) {
      return evaluatedContentVersion;
    }

    const activeSessionVersionId = activeSession?.versionId;

    // Versions match, return as is
    if (evaluatedContentVersion.id === activeSessionVersionId) {
      return evaluatedContentVersion;
    }

    // When activeSession version differs from published version:
    // Use the published version and set activeSession to null
    if (usePublishedVersionOnMismatch) {
      return {
        ...evaluatedContentVersion,
        session: {
          ...evaluatedContentVersion.session,
          activeSession: null,
        },
      };
    }

    return await this.findEvaluatedContentVersion(socketData, contentType, activeSessionVersionId);
  }

  /**
   * Handles session activation and setup
   */
  private async handleSessionActivation(
    context: ContentStartContext,
    result: ContentStartResult,
  ): Promise<boolean> {
    const { server, socketData, socket } = context;
    const { externalUserId, environment } = socketData;
    const {
      session,
      hideConditions = [],
      checklistConditions = [],
      forceGoToStep = false,
      isActivateOtherSockets = true,
    } = result;

    if (!session) {
      return false;
    }
    const trackConditions = [...hideConditions, ...checklistConditions];

    const roomId = buildExternalUserRoomId(environment.id, externalUserId);
    const activateSessionParams = {
      server,
      socket,
      session,
      socketData,
      trackConditions,
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
    return true;
  }

  /**
   * Handles session cancellation for hidden content
   * @param context - The content start context
   * @param result - The content start result
   * @returns True if cancellation was successful
   * @remarks
   * This method always fetches the latest socketData to ensure it has the most up-to-date
   * session state, especially when called after handleSessionActivation which may have
   * updated the socketData.
   */
  private async handleSessionCancellation(
    context: ContentStartContext,
    result: ContentStartResult,
  ): Promise<boolean> {
    const { session, hideConditions = [] } = result;
    if (!session) {
      return false;
    }

    const { server, socket, contentType, socketData } = context;
    const { environment, externalUserId } = socketData;
    const roomId = buildExternalUserRoomId(environment.id, externalUserId);
    const sessionId = session.id;

    this.logger.debug(`Hide rules are activated, canceling session, sessionId: ${sessionId}`);
    const cancelSessionParams: CancelSessionParams = {
      server,
      socket,
      socketData,
      sessionId,
      contentType,
      trackConditions: [...hideConditions],
    };
    return await this.cancelSessionInRoom(cancelSessionParams, roomId);
  }

  // ============================================================================
  // Session Activation Methods
  // ============================================================================

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
    const { socket, session, trackConditions, forceGoToStep, socketData } = params;
    const options = {
      trackConditions,
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
    const { socket, session, trackConditions, socketData } = params;
    const options = {
      trackConditions,
      cleanupContentTypes: [ContentDataType.CHECKLIST],
    };

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
        5, // Retry 5 times (increased from 3 to handle concurrent message processing)
        200, // Retry interval 200ms (increased from 100ms to allow more time for other operations)
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

  // ============================================================================
  // Session Cancellation Methods
  // ============================================================================

  /**
   * Cancels a session and optionally cancels other sessions in the same room
   * @param cancelSessionParams - The cancel session parameters
   * @param roomId - The room ID
   * @param cancelOtherSessions - Whether to cancel other sessions in the room (default: true)
   * @param unsetCurrentSession - Whether to unset the current session (default: true)
   * @returns True if cancellation was successful
   */
  private async cancelSessionInRoom(
    cancelSessionParams: CancelSessionParams,
    roomId: string,
    cancelOtherSessions = true,
    unsetCurrentSession = true,
  ): Promise<boolean> {
    const { sessionId, socket } = cancelSessionParams;
    this.logger.debug(`Canceling session, sessionId: ${sessionId}`);
    // Get the latest socketData to ensure we have the most up-to-date session state
    const socketData = await this.getSocketData(socket);
    if (!socketData) {
      this.logger.warn('Failed to get socketData for session cancellation');
      return false;
    }

    const cancelParams = {
      ...cancelSessionParams,
      socketData,
    };

    await this.cancelSocketSession({
      ...cancelParams,
      unsetSession: unsetCurrentSession,
    });
    if (cancelOtherSessions) {
      await this.cancelOtherSocketSessionsInRoom(roomId, cancelParams);
    }

    return true;
  }

  /**
   * Cancel socket session
   * Routes to appropriate cancellation method based on content type
   * @param params - The cancel session parameters
   * @returns True if the session was canceled successfully
   */
  private async cancelSocketSession(params: CancelSessionParams): Promise<boolean> {
    const { contentType } = params;
    if (isSingletonContentType(contentType)) {
      return await this.cancelContentSocketSession(params);
    }
    return await this.cancelBatchSocketSession(params);
  }

  /**
   * Cancel batch socket session
   * @param params - The cancel session parameters
   * @returns True if the session was canceled successfully
   */
  private async cancelBatchSocketSession(params: CancelSessionParams): Promise<boolean> {
    const { socket, socketData, contentId, contentType, unsetSession } = params;
    if (!contentId) {
      this.logger.warn('cancelBatchSocketSession: contentId is required but not provided');
      return false;
    }
    const sessions = extractSessionsByContentType(socketData, contentType);
    const currentSession = sessions.find((s) => s.content.id === contentId);
    if (!currentSession) {
      this.logger.warn(`cancelBatchSocketSession: session not found for contentId: ${contentId}`);
      return false;
    }

    return await this.socketOperationService.cleanupBatchSession(
      socket,
      socketData,
      currentSession,
      {
        unsetSession,
      },
    );
  }

  /**
   * Cancel content socket session (FLOW and CHECKLIST)
   * @param params - The cancel session parameters
   * @returns True if the session was canceled successfully
   */
  private async cancelContentSocketSession(params: CancelSessionParams): Promise<boolean> {
    const { server, socket, sessionId, socketData, contentType } = params;
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
    if (!currentSession || currentSession.id !== sessionId) {
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
    if (!result.session) {
      if (!(await this.cleanupSocketSession(currentSession, params))) {
        return false;
      }
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
    const {
      socket,
      socketData,
      unsetSession = true,
      setLastDismissedId = false,
      trackConditions,
    } = params;

    const options = {
      unsetSession,
      setLastDismissedId,
      trackConditions,
    };

    return await this.socketOperationService.cleanupSocketSession(
      socket,
      socketData,
      session,
      options,
    );
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
        5, // Retry 5 times (increased from 3 to handle concurrent message processing)
        200, // Retry interval 200ms (increased from 100ms to allow more time for other operations)
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

  // ============================================================================
  // Checklist Event Handlers
  // ============================================================================

  /**
   * Handles checklist completed event
   * @param socket - The socket
   * @param socketData - The socket data
   * @param evaluatedContentVersion - The evaluated content version
   * @returns Promise<void> - The promise that resolves when the event is handled
   */
  private async handleChecklistCompletedEvent(
    socket: Socket,
    socketData: SocketData,
    evaluatedContentVersion: CustomContentVersion,
  ): Promise<void> {
    const { environment, clientContext, clientConditions } = socketData;
    const latestSession = evaluatedContentVersion.session.latestSession;
    const contentType = evaluatedContentVersion.content.type;
    if (
      !latestSession?.id ||
      contentType !== ContentDataType.CHECKLIST ||
      !sessionIsAvailable(latestSession, ContentDataType.CHECKLIST)
    ) {
      return;
    }

    const sessionId = latestSession.id;
    const trackingParams = {
      environment,
      sessionId,
      clientContext,
    };

    const items = await evaluateChecklistItemsWithContext(
      evaluatedContentVersion,
      clientContext,
      clientConditions,
    );

    // Update checklist session with items and progress
    await this.eventTrackingService.updateChecklistSession(sessionId, items);

    // Track new completed task events
    const newCompletedItems = extractChecklistNewCompletedItems(items, latestSession.bizEvent);
    if (newCompletedItems.length > 0) {
      const taskIds = newCompletedItems.map((item) => item.id);
      // Track events for each completed task
      await Promise.all(
        taskIds.map((taskId) =>
          this.eventTrackingService.trackEventByType(BizEvents.CHECKLIST_TASK_COMPLETED, {
            ...trackingParams,
            taskId,
          }),
        ),
      );
      // Emit events for all tasks
      this.socketOperationService.emitChecklistTasksCompleted(socket, sessionId, taskIds);
    }

    // Check and track checklist completed event if all items are done
    if (canSendChecklistCompletedEvent(items, latestSession)) {
      await this.eventTrackingService.trackEventByType(
        BizEvents.CHECKLIST_COMPLETED,
        trackingParams,
      );
    }
  }

  /**
   * Handles checklist completed events
   * @param socket - The socket
   * @returns Promise<void> - The promise that resolves when the events are handled
   */
  async handleChecklistCompletedEvents(socket: Socket): Promise<void> {
    const socketData = await this.getSocketData(socket);
    if (!socketData) {
      return;
    }
    const evaluatedContentVersions = await this.findEvaluatedContentVersions(
      socketData,
      ContentDataType.CHECKLIST,
    );

    for (const evaluatedContentVersion of evaluatedContentVersions) {
      await this.handleChecklistCompletedEvent(socket, socketData, evaluatedContentVersion);
    }
  }

  // ============================================================================
  // Private Helper Methods - Batch Operations
  // ============================================================================

  /**
   * Prepare batch data for session creation
   * @param context - The content start context
   * @param contentType - The content type
   * @returns Result containing available versions and versions to track
   */
  private async prepareBatchData(
    context: ContentStartContext,
    contentType: ContentDataType,
  ): Promise<ContentDataPreparationResult> {
    const { socketData, options } = context;
    const { clientConditions, environment } = socketData;
    const { contentId, startReason = contentStartReason.START_FROM_CONDITION } = options ?? {};

    // Resolve version ID if content ID is provided
    const versionId = contentId
      ? await this.findPublishedVersionId(contentId, environment)
      : undefined;
    if (contentId && !versionId) {
      return { success: false, availableVersions: [], shouldTrackVersions: [], startReason };
    }

    // Evaluate and filter content versions
    const evaluatedVersions = await this.findEvaluatedContentVersions(
      socketData,
      contentType,
      versionId,
    );

    // Filter out dismissed versions first
    const activeEvaluatedVersions = evaluatedVersions.filter(
      (contentVersion) => !sessionIsDismissed(contentVersion.session.latestSession, contentType),
    );

    const availableVersions = filterAvailableAutoStartContentVersions(
      activeEvaluatedVersions,
      contentType,
      clientConditions,
    );

    // Versions that should be tracked but not activated
    // These are versions in activeEvaluatedVersions but not in availableVersions
    // (i.e., they don't meet auto-start conditions but may need client condition tracking)
    const shouldTrackVersions = activeEvaluatedVersions.filter(
      (version) => !availableVersions.some((v) => v.contentId === version.contentId),
    );

    return {
      success: true,
      availableVersions,
      shouldTrackVersions,
      startReason,
      versionId,
    };
  }

  /**
   * Create batch sessions for available content versions
   * @param availableVersions - Available content versions
   * @param socketData - Socket data
   * @param startReason - Start reason
   * @param versionId - Version ID
   * @param contentType - The content type
   * @returns Array of created sessions
   */
  private async createBatchSessions(
    availableVersions: CustomContentVersion[],
    socketData: SocketData,
    startReason: contentStartReason,
    versionId: string | undefined,
    contentType: ContentDataType,
  ): Promise<CustomContentSession[]> {
    const sessions = await Promise.all(
      availableVersions.map(async (contentVersion) => {
        const isAvailable = sessionIsAvailable(contentVersion.session.latestSession, contentType);
        const skipBizSession = !isAvailable && !versionId;

        return this.initializeSession(contentVersion, socketData, { startReason }, skipBizSession);
      }),
    );

    return sessions.filter((session): session is CustomContentSession => session !== null);
  }

  /**
   * Execute batch operations including activating sessions and tracking conditions
   * @param socket - Socket instance
   * @param socketData - Socket data
   * @param sessions - Sessions to activate
   * @param shouldTrackVersions - Versions to track
   * @param contentType - The content type
   * @returns True if operations were successful
   */
  private async executeBatchOperations(
    socket: Socket,
    socketData: SocketData,
    sessions: CustomContentSession[],
    shouldTrackVersions: CustomContentVersion[],
    contentType: ContentDataType,
  ): Promise<boolean> {
    // Activate sessions via socket operation service
    const sessionsActivated = await this.socketOperationService.activateBatchSessions(
      socket,
      socketData,
      sessions,
      contentType,
    );
    if (!sessionsActivated) {
      return false;
    }

    // Track conditions for versions that should be tracked but not activated
    const { preTracks = [] } = await this.extractClientConditions(contentType, shouldTrackVersions);
    if (preTracks.length === 0) {
      return true;
    }

    const updatedSocketData = await this.getSocketData(socket);
    if (!updatedSocketData) {
      return false;
    }

    return await this.socketOperationService.trackClientConditions(
      socket,
      updatedSocketData,
      preTracks,
    );
  }

  // ============================================================================
  // Content Event Tracking Methods
  // ============================================================================

  /**
   * Track auto start event for flows or checklists
   * @param sessionId - The session ID
   * @param contentType - The content type (FLOW, CHECKLIST, or LAUNCHER)
   * @param environment - The environment
   * @param startReason - The start reason
   * @param stepId - Optional step ID to navigate to after start
   * @param clientContext - The client context
   * @returns True if the event was tracked successfully
   */
  async trackAutoStartEvent(
    sessionId: string,
    contentType: ContentDataType,
    environment: Environment,
    startReason: string,
    stepId: string | null,
    clientContext: ClientContext,
  ): Promise<boolean> {
    const startEventType = getStartEventType(contentType);
    if (!startEventType) {
      return false;
    }

    const baseEventParams = {
      sessionId,
      environment,
      clientContext,
    };

    // Build events array
    const events: EventTrackingItem[] = [
      {
        eventType: startEventType,
        params: {
          ...baseEventParams,
          startReason,
        },
      },
    ];

    // Add go to step event if stepId is provided
    if (stepId) {
      events.push({
        eventType: BizEvents.FLOW_STEP_SEEN,
        params: {
          ...baseEventParams,
          stepId,
        },
      });
    }

    return await this.eventTrackingService.trackEventsByType(events);
  }

  /**
   * Track content ended event based on content type
   * This method abstracts the logic of tracking different content end events
   * based on the content type (FLOW, CHECKLIST, or LAUNCHER)
   * @param sessionId - The session ID
   * @param contentType - The content type
   * @param environment - The environment
   * @param clientContext - The client context
   * @param endReason - The end reason
   * @returns True if the event was tracked successfully, false otherwise
   */
  async trackContentEndedEvent(
    sessionId: string,
    contentType: ContentDataType,
    environment: Environment,
    clientContext: ClientContext,
    endReason: string,
  ): Promise<boolean> {
    const endEventType = getEndEventType(contentType);
    if (!endEventType) {
      return false;
    }
    const eventParams = {
      sessionId,
      environment,
      clientContext,
      endReason,
    };

    return await this.eventTrackingService.trackEventByType(endEventType, eventParams);
  }
}
