import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ContentDataType } from '@usertour/types';
import {
  CustomContentSession,
  TrackCondition,
  SocketData,
  ClientCondition,
  ConditionWaitTimer,
} from '@/common/types';
import { SocketEmitterService } from './socket-emitter.service';
import { SocketParallelService } from './socket-parallel.service';
import {
  categorizeClientConditions,
  filterAndPreserveConditions,
  filterAndPreserveWaitTimers,
  convertToClientConditions,
  categorizeLauncherSessions,
} from '@/utils/websocket-utils';
import { SocketDataService } from './socket-data.service';

/**
 * Options for cleaning up socket session
 */
interface CleanupSocketSessionOptions {
  /** Whether to execute unsetSocketSession, defaults to true */
  unsetSession?: boolean;
  /** Whether to set lastDismissedFlowId and lastDismissedChecklistId, defaults to false */
  setLastDismissedId?: boolean;
  /** Optional array of content types to cleanup client conditions for */
  // cleanupContentTypes?: ContentDataType[];
}

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

  /**
   * Emit unset socket session event with acknowledgment
   * @param socket - The socket instance
   * @param sessionId - The session id to unset
   * @param contentType - The content type to unset
   * @returns Promise<boolean> - True if the session was unset and acknowledged by client
   */
  private async unsetSocketSession(
    socket: Socket,
    sessionId: string,
    contentType: ContentDataType,
  ): Promise<boolean> {
    if (contentType === ContentDataType.FLOW) {
      return await this.socketEmitterService.unsetFlowSessionWithAck(socket, sessionId);
    }
    if (contentType === ContentDataType.CHECKLIST) {
      return await this.socketEmitterService.unsetChecklistSessionWithAck(socket, sessionId);
    }

    this.logger.warn(`Unsupported content type: ${contentType}`);
    return false;
  }

  /**
   * Cleanup conditions efficiently with parallel processing
   * @param socket - The socket
   * @param clientConditions - All client conditions
   * @param waitTimers - Condition wait timers to cleanup
   * @param cleanupContentTypes - Optional array of content types to cleanup client conditions for
   * @returns Object containing remaining conditions and timers after cleanup
   */
  private async cleanupConditions(
    socket: Socket,
    socketData: SocketData,
    cleanupContentTypes?: ContentDataType[],
  ): Promise<Pick<SocketData, 'clientConditions' | 'waitTimers'>> {
    const { clientConditions = [], waitTimers = [] } = socketData;
    // Filter and preserve client conditions based on content type filter
    const { filteredConditions, preservedConditions } = filterAndPreserveConditions(
      clientConditions,
      cleanupContentTypes,
    );
    // Filter and preserve wait timers based on content type filter
    const { filteredWaitTimers, preservedWaitTimers } = filterAndPreserveWaitTimers(
      waitTimers,
      cleanupContentTypes,
    );
    // Un-track client conditions
    filteredConditions.map((condition) =>
      this.socketEmitterService.untrackClientEvent(socket, condition.conditionId),
    );
    filteredWaitTimers.map((timer) =>
      this.socketEmitterService.cancelConditionWaitTimer(socket, timer),
    );
    return {
      clientConditions: preservedConditions,
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

  /**
   * Emit conditions efficiently with parallel operations on session activation
   * @param socket - The socket
   * @param socketData - The socket client data
   * @param trackConditions - New conditions to track
   * @param cleanupContentTypes - Optional array of content types to cleanup client conditions for
   * @returns Object containing updated conditions and remaining timers
   */
  private async emitConditionsOnActivation(
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
    const { unsetSession = true, setLastDismissedId = false } = options;
    const contentType = session.content.type;

    // Send WebSocket messages first if shouldUnsetSession is true, return false if any fails
    if (unsetSession && !(await this.unsetSocketSession(socket, session.id, contentType))) {
      return false;
    }

    // Cleanup conditions efficiently
    const conditionChanges = await this.cleanupConditions(socket, socketData, [contentType]);

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

    return await this.socketDataService.set(socket.id, updatedSocketData, true);
  }

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

    // Emit condition changes efficiently
    const conditionChanges = await this.emitConditionsOnActivation(
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

    return await this.socketDataService.set(socket.id, updatedSocketData, true);
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

    // Emit condition changes efficiently
    const conditionChanges = await this.emitConditionsOnActivation(
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

    return await this.socketDataService.set(socket.id, updatedSocketData, true);
  }

  /**
   * Add launcher sessions
   * @param socket - The socket
   * @param currentSessions - Current launcher sessions
   * @param targetSessions - Target launcher sessions
   * @returns Promise<boolean> - True if the sessions were added successfully
   */
  async addLaunchers(
    socket: Socket,
    currentSessions: CustomContentSession[],
    targetSessions: CustomContentSession[],
  ) {
    // Use optimized utility function to categorize sessions in a single pass
    const { newSessions, removedSessions, preservedSessions } = categorizeLauncherSessions(
      currentSessions,
      targetSessions,
    );

    // Execute parallel operations for adding and removing sessions
    const [addedSessions, removedContentIds] = await Promise.all([
      this.socketParallelService.addLaunchers(socket, newSessions),
      this.socketParallelService.removeLaunchers(
        socket,
        removedSessions.map((session) => session.content.id),
      ),
    ]);

    // Filter out sessions that were not successfully removed
    const unremovedSessions = removedSessions.filter(
      (session) => !removedContentIds.includes(session.content.id),
    );

    // Merge all sessions efficiently
    const launcherSessions = [...preservedSessions, ...unremovedSessions, ...addedSessions];

    return await this.socketDataService.set(socket.id, { launcherSessions }, true);
  }

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
      socket.id,
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
      socket.id,
      {
        waitTimers: [...existingTimers, ...startedTimers],
      },
      true,
    );
  }

  /**
   * Emit checklist tasks completed events
   * @param socket - The socket
   * @param taskIds - The task IDs to emit completed events for
   * @returns string[] - The task IDs that were successfully emitted
   */
  emitChecklistTasksCompleted(socket: Socket, taskIds: string[]): string[] {
    return taskIds.filter((taskId) =>
      this.socketEmitterService.checklistTaskCompleted(socket, taskId),
    );
  }
}
