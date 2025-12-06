import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import {
  ContentDataType,
  CustomContentSession,
  TrackCondition,
  ClientCondition,
  ConditionWaitTimer,
} from '@usertour/types';
import { SocketData } from '@/common/types';
import { SocketEmitterService } from './socket-emitter.service';
import { SocketParallelService } from './socket-parallel.service';
import {
  categorizeClientConditions,
  filterAndPreserveConditions,
  filterAndPreserveWaitTimers,
  convertToClientConditions,
  categorizeSessions,
  detectChangedPreservedSessions,
  extractSessionsByContentType,
} from '@/utils/websocket-utils';
import { SocketDataService } from './socket-data.service';

// ============================================================================
// Type Definitions and Interfaces
// ============================================================================

// Session Options
interface ActivateFlowSessionOptions {
  /** The conditions to track */
  trackConditions?: TrackCondition[];
  /** Whether to force go to step, defaults to false */
  forceGoToStep?: boolean;
  /** Optional array of content types to cleanup client conditions for */
  cleanupContentTypes?: ContentDataType[];
}

interface ActivateChecklistSessionOptions {
  /** The conditions to track */
  trackConditions?: TrackCondition[];
  /** Optional array of content types to cleanup client conditions for */
  cleanupContentTypes?: ContentDataType[];
}

interface CleanupSocketSessionOptions {
  /** Whether to execute unsetSocketSession, defaults to true */
  unsetSession?: boolean;
  /** Whether to set lastDismissedFlowId and lastDismissedChecklistId, defaults to false */
  setLastDismissedId?: boolean;
  trackConditions?: TrackCondition[];
}

// Batch Session Operations (Multi-instance Content Types)
interface EmitBatchSessionsOptions {
  /** The socket instance */
  socket: Socket;
  /** Sessions to add */
  sessionsToAdd: CustomContentSession[];
  /** Content IDs to remove */
  contentIdsToRemove: string[];
  /** Content type to determine which methods to call */
  contentType: ContentDataType;
}

interface EmitBatchSessionsResult {
  /** Successfully added sessions */
  addedSessions: CustomContentSession[];
  /** Successfully removed content IDs */
  removedContentIds: string[];
}

interface HandleBatchSessionsOptions {
  /** Current sessions */
  currentSessions: CustomContentSession[];
  /** New sessions to add */
  newSessions: CustomContentSession[];
  /** The socket instance */
  socket: Socket;
  /** Content type to determine which methods to call */
  contentType: ContentDataType;
}

interface HandleBatchSessionsResult {
  /** Updated sessions after processing */
  updatedSessions: CustomContentSession[];
  /** Successfully removed content IDs */
  removedContentIds: string[];
}

// Batch Condition Operations
interface CleanupBatchConditionsOptions {
  /** All client conditions */
  clientConditions: ClientCondition[];
  /** Array of content IDs that were removed */
  removedContentIds: string[];
  /** The socket instance */
  socket: Socket;
  /** Array of content types to cleanup client conditions for */
  cleanupContentTypes: ContentDataType[];
}

// ============================================================================
// Socket Operation Service
// ============================================================================

/**
 * Socket operation service
 * Handles socket operations for content sessions and client conditions
 * Focused on session lifecycle management, condition tracking, and WebSocket communication
 * Delegates session creation and manipulation to SessionBuilderService
 */
@Injectable()
export class SocketOperationService {
  private readonly logger = new Logger(SocketOperationService.name);

  constructor(
    private readonly socketEmitterService: SocketEmitterService,
    private readonly socketParallelService: SocketParallelService,
    private readonly socketDataService: SocketDataService,
  ) {}

  // ============================================================================
  // Public API Methods - Singleton Content Sessions (FLOW and CHECKLIST)
  // ============================================================================

  /**
   * Activate Flow session
   * @param socket - The socket
   * @param socketData - The socket client data
   * @param session - The Flow session to activate
   * @param options - Options for Flow activation behavior
   * @returns Promise<boolean> - True if the session was activated successfully
   */
  async activateFlowSession(
    socket: Socket,
    socketData: SocketData,
    session: CustomContentSession,
    options: ActivateFlowSessionOptions = {},
  ): Promise<boolean> {
    const { trackConditions = [], forceGoToStep = false, cleanupContentTypes } = options;
    // Set Flow session
    const isSetSession = await this.socketEmitterService.setFlowSessionWithAck(socket, session);
    if (!isSetSession) {
      return false;
    }

    // Force go to step if needed (Flow-specific logic)
    if (forceGoToStep && session.currentStep?.id) {
      await this.socketEmitterService.forceGoToStepWithAck(
        socket,
        session.id,
        session.currentStep.id,
      );
    }

    // Sync condition state efficiently
    const conditionChanges = await this.emitConditions(
      socket,
      socketData,
      trackConditions,
      cleanupContentTypes,
    );
    if (!conditionChanges) {
      return false;
    }

    // Update client data with Flow session and all condition changes
    const updatedSocketData: Partial<SocketData> = {
      ...conditionChanges,
      flowSession: session,
      lastDismissedFlowId: undefined,
    };

    return await this.socketDataService.set(socket, updatedSocketData, true);
  }

  /**
   * Activate Checklist session
   * @param socket - The socket
   * @param socketData - The socket client data
   * @param session - The Checklist session to activate
   * @param options - Options for Checklist activation behavior
   * @returns Promise<boolean> - True if the session was activated successfully
   */
  async activateChecklistSession(
    socket: Socket,
    socketData: SocketData,
    session: CustomContentSession,
    options: ActivateChecklistSessionOptions = {},
  ): Promise<boolean> {
    const { trackConditions = [], cleanupContentTypes } = options;

    // Set Checklist session
    const isSetSession = await this.socketEmitterService.setChecklistSessionWithAck(
      socket,
      session,
    );
    if (!isSetSession) {
      return false;
    }

    // Sync condition state efficiently
    const conditionChanges = await this.emitConditions(
      socket,
      socketData,
      trackConditions,
      cleanupContentTypes,
    );
    if (!conditionChanges) {
      return false;
    }

    // Update client data with Checklist session and all condition changes
    const updatedSocketData: Partial<SocketData> = {
      ...conditionChanges,
      checklistSession: session,
      lastDismissedChecklistId: undefined,
    };

    return await this.socketDataService.set(socket, updatedSocketData, true);
  }

  /**
   * Cleanup socket session and associated conditions
   * @param socket - The socket instance
   * @param socketData - The socket client data
   * @param session - The session to cleanup
   * @param options - Options for cleanup behavior
   * @returns Promise<boolean> - True if the session was cleaned up successfully
   */
  async cleanupSocketSession(
    socket: Socket,
    socketData: SocketData,
    session: CustomContentSession,
    options: CleanupSocketSessionOptions = {},
  ): Promise<boolean> {
    const { unsetSession = true, setLastDismissedId = false, trackConditions = [] } = options;
    const contentType = session.content.type;

    // Send WebSocket messages first if shouldUnsetSession is true, return false if any fails
    if (unsetSession && !(await this.unsetSocketSession(socket, session))) {
      return false;
    }

    // Cleanup conditions efficiently
    // const conditionChanges = await this.cleanupConditions(socket, socketData, [contentType]);

    const conditionChanges = await this.emitConditions(socket, socketData, trackConditions, [
      contentType,
    ]);
    if (!conditionChanges) {
      return false;
    }

    // Update client data with session clearing and remaining conditions/timers
    // Now simplified as message queue ensures ordered execution
    const updatedSocketData = {
      ...conditionChanges,
      ...(contentType === ContentDataType.FLOW && {
        ...(setLastDismissedId && { lastDismissedFlowId: session.content.id }),
        flowSession: undefined,
      }),
      ...(contentType === ContentDataType.CHECKLIST && {
        ...(setLastDismissedId && { lastDismissedChecklistId: session.content.id }),
        checklistSession: undefined,
      }),
    };

    return await this.socketDataService.set(socket, updatedSocketData, true);
  }

  // ============================================================================
  // Public API Methods - Multi-instance Content Sessions
  // ============================================================================

  /**
   * Activate multiple sessions (for non-singleton content types like LAUNCHER)
   * Supports multiple concurrent sessions for the same content type
   * Note: Singleton content types (FLOW, CHECKLIST) should use activateFlowSession/activateChecklistSession instead
   * @param socket - The socket
   * @param socketData - The socket client data
   * @param sessions - Target sessions to activate
   * @param contentType - The content type (must be non-singleton)
   * @returns Promise<boolean> - True if the sessions were activated successfully
   */
  async activateBatchSessions(
    socket: Socket,
    socketData: SocketData,
    sessions: CustomContentSession[],
    contentType: ContentDataType,
  ): Promise<boolean> {
    const { clientConditions = [] } = socketData;
    const currentSessions = extractSessionsByContentType(socketData, contentType);

    // Process sessions: add new, update changed, remove obsolete
    const { updatedSessions, removedContentIds } = await this.handleBatchSessions({
      currentSessions,
      newSessions: sessions,
      socket,
      contentType,
    });

    // Cleanup conditions for removed content
    const { clientConditions: updatedConditions } = this.cleanupBatchConditions({
      clientConditions,
      removedContentIds,
      socket,
      cleanupContentTypes: [contentType],
    });

    // Update socket data
    const updateData: Partial<SocketData> =
      contentType === ContentDataType.LAUNCHER ? { launcherSessions: updatedSessions } : {};

    return await this.socketDataService.set(
      socket,
      {
        ...updateData,
        clientConditions: updatedConditions,
      },
      true,
    );
  }

  /**
   * Clean up multi-instance session (for non-singleton content types like LAUNCHER)
   * @param socket - The socket
   * @param socketData - The socket client data
   * @param session - The session to clean up
   * @param options - Options for cleanup behavior
   * @returns Promise<boolean> - True if the session was removed successfully
   */
  async cleanupBatchSession(
    socket: Socket,
    socketData: SocketData,
    session: CustomContentSession,
    options: CleanupSocketSessionOptions = {},
  ): Promise<boolean> {
    const { unsetSession = true } = options;
    const { clientConditions = [] } = socketData;
    const contentType = session.content.type;
    const contentId = session.content.id;
    const currentSessions = extractSessionsByContentType(socketData, contentType);

    // Send WebSocket messages first if shouldUnsetSession is true, return false if any fails
    if (unsetSession && !(await this.unsetSocketSession(socket, session))) {
      return false;
    }

    // Handle client conditions update
    const { clientConditions: updatedConditions } = this.cleanupBatchConditions({
      clientConditions,
      removedContentIds: [contentId],
      socket,
      cleanupContentTypes: [contentType],
    });

    const updatedSessions = currentSessions.filter((s) => s.content.id !== contentId);

    // Update socket data with processed sessions and conditions
    const updateData: Partial<SocketData> =
      contentType === ContentDataType.LAUNCHER ? { launcherSessions: updatedSessions } : {};

    return await this.socketDataService.set(
      socket,
      {
        ...updateData,
        clientConditions: updatedConditions,
      },
      true,
    );
  }

  // ============================================================================
  // Public API Methods - Condition Management
  // ============================================================================

  /**
   * Track client conditions
   * @param socket - The socket
   * @param socketData - The socket client data
   * @param trackConditions - The conditions to track
   * @returns Promise<boolean> - True if the conditions were tracked successfully
   */
  async trackClientConditions(
    socket: Socket,
    socketData: SocketData,
    trackConditions: TrackCondition[],
  ): Promise<boolean> {
    const { clientConditions } = socketData;
    // Track the client conditions, because no content was found to start
    const newTrackConditions = trackConditions?.filter(
      (trackCondition) =>
        !clientConditions?.some(
          (clientCondition) => clientCondition.conditionId === trackCondition.condition.id,
        ),
    );
    if (newTrackConditions.length === 0) {
      return true;
    }
    const trackedConditions = await this.socketParallelService.trackClientConditions(
      socket,
      newTrackConditions,
    );
    const trackedClientConditions = convertToClientConditions(trackedConditions);

    // If not all conditions were tracked, log an error and return false
    if (trackedConditions.length !== newTrackConditions.length) {
      this.logger.error(
        `Failed to track all conditions: ${newTrackConditions.length} conditions to track,
         ${trackedConditions.length} conditions tracked`,
      );
      return false;
    }

    const newClientConditions = [...clientConditions, ...trackedClientConditions];

    return await this.socketDataService.set(
      socket,
      {
        clientConditions: newClientConditions,
      },
      true,
    );
  }

  /**
   * Start condition wait timers
   * @param socket - The socket
   * @param socketData - The socket client data
   * @param waitTimers - The wait timers to start
   * @returns Promise<boolean> - True if the wait timers were started successfully
   */
  async startConditionWaitTimers(
    socket: Socket,
    socketData: SocketData,
    waitTimers: ConditionWaitTimer[],
  ): Promise<boolean> {
    const { waitTimers: existingTimers = [] } = socketData;

    const newWaitTimers = waitTimers?.filter(
      (waitTimer) =>
        !existingTimers.some((existingTimer) => existingTimer.versionId === waitTimer.versionId),
    );

    const startedTimers = await this.socketParallelService.startConditionWaitTimers(
      socket,
      newWaitTimers,
    );

    // If not all wait timers were started, log an error and return false
    if (startedTimers.length !== newWaitTimers.length) {
      this.logger.error(
        `Failed to start all wait timers: ${newWaitTimers.length} wait timers to start,
         ${startedTimers.length} wait timers started`,
      );
      return false;
    }

    return await this.socketDataService.set(
      socket,
      {
        waitTimers: [...existingTimers, ...startedTimers],
      },
      true,
    );
  }

  // ============================================================================
  // Public API Methods - Checklist Events
  // ============================================================================

  /**
   * Emit checklist tasks completed events
   * @param socket - The socket
   * @param sessionId - The session id to complete the task for
   * @param taskIds - The task IDs to emit completed events for
   * @returns string[] - The task IDs that were successfully emitted
   */
  emitChecklistTasksCompleted(socket: Socket, sessionId: string, taskIds: string[]): string[] {
    return taskIds.filter((taskId) =>
      this.socketEmitterService.checklistTaskCompleted(socket, sessionId, taskId),
    );
  }

  // ============================================================================
  // Private Helper Methods - Batch Session Operations
  // ============================================================================

  /**
   * Handle batch sessions processing
   * Processes session additions, removals, and preserves existing sessions
   * @param params - Parameters for handling batch sessions
   * @returns Promise containing updated sessions and removed content IDs
   */
  private async handleBatchSessions(
    params: HandleBatchSessionsOptions,
  ): Promise<HandleBatchSessionsResult> {
    const { currentSessions, newSessions, socket, contentType } = params;
    const {
      newSessions: categorizedNewSessions,
      removedSessions,
      preservedSessions,
    } = categorizeSessions(currentSessions, newSessions);

    // Second pass: detect changes in preserved sessions
    const changedPreservedSessions = detectChangedPreservedSessions(
      currentSessions,
      preservedSessions,
    );

    const preservedUnchangedSessions = preservedSessions.filter(
      (session) => !changedPreservedSessions.some((s) => s.id === session.id),
    );

    const toAdd = [...categorizedNewSessions, ...changedPreservedSessions];
    const contentIdsToRemove = removedSessions.map((session) => session.content.id);

    const { addedSessions, removedContentIds } = await this.emitBatchSessions({
      socket,
      sessionsToAdd: toAdd,
      contentIdsToRemove,
      contentType,
    });

    const unremovedSessions = removedSessions.filter(
      (session) => !removedContentIds.includes(session.content.id),
    );

    return {
      updatedSessions: [...preservedUnchangedSessions, ...unremovedSessions, ...addedSessions],
      removedContentIds,
    };
  }

  /**
   * Emit batch sessions in parallel based on content type
   * Handles session additions and removals for multi-instance content types
   * @param params - Parameters for emitting batch sessions
   * @returns Promise containing added sessions and removed content IDs
   */
  private async emitBatchSessions(
    params: EmitBatchSessionsOptions,
  ): Promise<EmitBatchSessionsResult> {
    const { socket, sessionsToAdd, contentIdsToRemove, contentType } = params;
    // Early return if no operations are needed
    if (sessionsToAdd.length === 0 && contentIdsToRemove.length === 0) {
      return { addedSessions: [], removedContentIds: [] };
    }
    switch (contentType) {
      case ContentDataType.LAUNCHER: {
        const [addedSessions, removedContentIds] = await Promise.all([
          this.socketParallelService.addLaunchers(socket, sessionsToAdd),
          this.socketParallelService.removeLaunchers(socket, contentIdsToRemove),
        ]);
        return { addedSessions, removedContentIds };
      }
      default:
        this.logger.warn(`Unsupported content type for emitBatchSessions: ${contentType}`);
        return { addedSessions: [], removedContentIds: [] };
    }
  }

  // ============================================================================
  // Private Helper Methods - Session Operations (Common)
  // ============================================================================

  /**
   * Emit unset socket session event with acknowledgment
   * Supports both singleton (FLOW, CHECKLIST) and batch (LAUNCHER) content types
   * @param socket - The socket instance
   * @param session - The session to unset
   * @returns Promise<boolean> - True if the session was unset and acknowledged by client
   */
  private async unsetSocketSession(
    socket: Socket,
    session: CustomContentSession,
  ): Promise<boolean> {
    const contentType = session.content.type;
    if (contentType === ContentDataType.FLOW) {
      return await this.socketEmitterService.unsetFlowSessionWithAck(socket, session.id);
    }
    if (contentType === ContentDataType.CHECKLIST) {
      return await this.socketEmitterService.unsetChecklistSessionWithAck(socket, session.id);
    }

    if (contentType === ContentDataType.LAUNCHER) {
      return await this.socketEmitterService.removeLauncherWithAck(socket, session.content.id);
    }

    this.logger.warn(`Unsupported content type: ${contentType}`);
    return false;
  }

  // ============================================================================
  // Private Helper Methods - Condition Operations (Singleton)
  // ============================================================================

  /**
   * Emit conditions efficiently with parallel operations
   * Handles condition tracking, untracking, and wait timer management for singleton content types
   * @param socket - The socket
   * @param socketData - The socket client data
   * @param trackConditions - New conditions to track
   * @param cleanupContentTypes - Optional array of content types to cleanup client conditions for
   * @returns Object containing updated conditions and remaining timers
   */
  private async emitConditions(
    socket: Socket,
    socketData: SocketData,
    trackConditions: TrackCondition[],
    cleanupContentTypes?: ContentDataType[],
  ): Promise<Pick<SocketData, 'clientConditions' | 'waitTimers'> | null> {
    const { clientConditions = [], waitTimers = [] } = socketData;
    // Filter and preserve client conditions based on content type filter
    const { filteredConditions, preservedConditions: preservedClientConditions } =
      filterAndPreserveConditions(clientConditions, cleanupContentTypes);

    // Categorize client conditions into preserved, untrack, and track groups
    const { preservedConditions, conditionsToUntrack, conditionsToTrack } =
      categorizeClientConditions(filteredConditions, trackConditions);

    // Filter and preserve wait timers based on content type filter
    const { filteredWaitTimers, preservedWaitTimers } = filterAndPreserveWaitTimers(
      waitTimers,
      cleanupContentTypes,
    );

    // Execute and validate parallel condition operations
    const isSuccess = await this.executeParallelConditionOperations(
      socket,
      conditionsToUntrack,
      filteredWaitTimers,
      conditionsToTrack,
    );
    if (!isSuccess) {
      return null;
    }

    const trackedClientConditions = convertToClientConditions(conditionsToTrack);

    const updatedConditions = [
      ...preservedClientConditions,
      ...preservedConditions,
      ...trackedClientConditions,
    ];

    return {
      clientConditions: updatedConditions,
      waitTimers: preservedWaitTimers,
    };
  }

  /**
   * Execute and validate parallel condition operations
   * @param socket - The socket instance
   * @param conditionsToUntrack - Conditions to untrack
   * @param waitTimers - Wait timers to cancel
   * @param conditionsToTrack - Conditions to track
   * @returns True if all operations completed successfully
   */
  private async executeParallelConditionOperations(
    socket: Socket,
    conditionsToUntrack: ClientCondition[],
    waitTimers: ConditionWaitTimer[],
    conditionsToTrack: TrackCondition[],
  ): Promise<boolean> {
    // Execute all condition operations in parallel
    const [untrackedConditions, cancelledTimers, newConditions] = await Promise.all([
      this.socketParallelService.untrackClientConditions(socket, conditionsToUntrack),
      this.socketParallelService.cancelConditionWaitTimers(socket, waitTimers),
      this.socketParallelService.trackClientConditions(socket, conditionsToTrack),
    ]);

    // Validate results
    if (
      untrackedConditions.length !== conditionsToUntrack.length ||
      cancelledTimers.length !== waitTimers.length ||
      newConditions.length !== conditionsToTrack.length
    ) {
      this.logger.error(
        `Failed to execute all condition operations: ${conditionsToUntrack.length} conditions to untrack,
         ${waitTimers.length} wait timers to cancel, ${conditionsToTrack.length} conditions to track`,
      );
      return false;
    }

    return true;
  }

  // ============================================================================
  // Private Helper Methods - Condition Operations (Batch)
  // ============================================================================

  /**
   * Cleanup conditions for removed batch content
   * @param params - Parameters for cleanup batch conditions
   * @returns Object containing updated conditions after cleanup
   */
  private cleanupBatchConditions(
    params: CleanupBatchConditionsOptions,
  ): Pick<SocketData, 'clientConditions'> {
    const { clientConditions, removedContentIds, socket, cleanupContentTypes } = params;
    const { filteredConditions, preservedConditions } = filterAndPreserveConditions(
      clientConditions,
      cleanupContentTypes,
    );

    // Use Set for O(1) lookup performance instead of nested array operations
    const removedContentIdSet = new Set(removedContentIds);

    const untrackedConditions: ClientCondition[] = [];
    const trackedConditions: ClientCondition[] = [];

    // Single pass categorization for better performance
    for (const condition of filteredConditions) {
      if (removedContentIdSet.has(condition.contentId)) {
        untrackedConditions.push(condition);
      } else {
        trackedConditions.push(condition);
      }
    }

    // Cancel tracking for conditions that are no longer needed
    for (const condition of untrackedConditions) {
      this.socketEmitterService.untrackClientEvent(socket, condition.conditionId);
    }

    return {
      clientConditions: [...preservedConditions, ...trackedConditions],
    };
  }
}
