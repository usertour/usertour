import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ContentDataType } from '@usertour/types';
import {
  CustomContentSession,
  TrackCondition,
  SocketClientData,
  ClientCondition,
  ConditionWaitTimer,
} from '@/common/types';
import { SocketEmitterService } from './socket-emitter.service';
import { SocketParallelService } from './socket-parallel.service';
import {
  categorizeClientConditions,
  calculateRemainingClientConditions,
  calculateRemainingConditionWaitTimers,
  filterAndPreserveConditions,
  filterAndPreserveWaitTimers,
} from '@/utils/websocket-utils';
import { SocketClientDataService } from './socket-client-data.service';

/**
 * Options for cleaning up socket session
 */
export interface CleanupSocketSessionOptions {
  /** Whether to execute unsetSocketSession, defaults to true */
  shouldUnsetSession?: boolean;
  /** Whether to set lastDismissedFlowId and lastDismissedChecklistId, defaults to false */
  shouldSetLastDismissedId?: boolean;
  /** Optional array of content types to filter client conditions by */
  contentTypeFilter?: ContentDataType[];
}

export interface ActivateFlowSessionOptions {
  /** The conditions to track */
  trackConditions?: TrackCondition[];
  /** Whether to force go to step, defaults to false */
  forceGoToStep?: boolean;
  /** Optional array of content types to filter client conditions by */
  contentTypeFilter?: ContentDataType[];
}

export interface ActivateChecklistSessionOptions {
  /** The conditions to track */
  trackConditions?: TrackCondition[];
  /** Optional array of content types to filter client conditions by */
  contentTypeFilter?: ContentDataType[];
}

interface ConditionChangesResult {
  clientConditions: ClientCondition[];
  remainingTimers: ConditionWaitTimer[];
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
    private readonly socketClientDataService: SocketClientDataService,
  ) {}

  /**
   * Emit unset socket session event with acknowledgment
   * @param socket - The socket instance
   * @param session - The session to unset
   * @returns Promise<boolean> - True if the session was unset and acknowledged by client
   */
  private async unsetSocketSession(
    socket: Socket,
    session: CustomContentSession,
  ): Promise<boolean> {
    const contentType = session.content.type as ContentDataType;
    const sessionId = session.id;
    switch (contentType) {
      case ContentDataType.FLOW:
        return await this.socketEmitterService.unsetFlowSessionWithAck(socket, sessionId);
      case ContentDataType.CHECKLIST:
        return await this.socketEmitterService.unsetChecklistSessionWithAck(socket, sessionId);
      default:
        this.logger.warn(`Unsupported content type: ${contentType}`);
        return false;
    }
  }

  /**
   * Emit condition cleanup operations efficiently with parallel processing
   * @param socket - The socket
   * @param clientConditions - All client conditions
   * @param waitTimers - Condition wait timers to cleanup
   * @param contentTypeFilter - Optional array of content types to filter client conditions by
   * @returns Object containing remaining conditions and timers after cleanup
   */
  private async emitConditionCleanup(
    socket: Socket,
    clientConditions: ClientCondition[],
    waitTimers: ConditionWaitTimer[],
    contentTypeFilter?: ContentDataType[],
  ): Promise<ConditionChangesResult> {
    // Filter and preserve client conditions based on content type filter
    const { filteredConditions, preservedConditions } = filterAndPreserveConditions(
      clientConditions,
      contentTypeFilter,
    );
    // Filter and preserve wait timers based on content type filter
    const { filteredWaitTimers, preservedWaitTimers } = filterAndPreserveWaitTimers(
      waitTimers,
      contentTypeFilter,
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
      remainingTimers: preservedWaitTimers,
    };
  }

  /**
   * Emit condition changes efficiently with parallel operations
   * @param socket - The socket
   * @param clientConditions - All client conditions
   * @param waitTimers - Current condition wait timers
   * @param trackConditions - New conditions to track
   * @param contentTypeFilter - Optional array of content types to filter client conditions by
   * @returns Object containing updated conditions and remaining timers
   */
  private async emitConditionChanges(
    socket: Socket,
    clientConditions: ClientCondition[],
    waitTimers: ConditionWaitTimer[],
    trackConditions: TrackCondition[],
    contentTypeFilter?: ContentDataType[],
  ): Promise<ConditionChangesResult> {
    // Filter and preserve client conditions based on content type filter
    const { filteredConditions, preservedConditions: preservedClientConditions } =
      filterAndPreserveConditions(clientConditions, contentTypeFilter);

    // Categorize client conditions into preserved, untrack, and track groups
    const { preservedConditions, conditionsToUntrack, conditionsToTrack } =
      categorizeClientConditions(filteredConditions, trackConditions);

    // Execute all condition operations in parallel
    const [untrackedConditions, cancelledTimers, newConditions] = await Promise.all([
      this.socketParallelService.untrackClientConditions(socket, conditionsToUntrack),
      this.socketParallelService.cancelConditionWaitTimers(socket, waitTimers),
      this.socketParallelService.trackClientConditions(socket, conditionsToTrack),
    ]);

    // Calculate remaining conditions and timers (those that failed to process)
    const remainingConditions = calculateRemainingClientConditions(
      conditionsToUntrack,
      untrackedConditions,
    );
    const remainingTimers = calculateRemainingConditionWaitTimers(waitTimers, cancelledTimers);

    const updatedConditions = [...preservedConditions, ...remainingConditions, ...newConditions];

    return {
      clientConditions: [...updatedConditions, ...preservedClientConditions],
      remainingTimers,
    };
  }

  /**
   * Cleanup socket session and associated conditions
   * @param socket - The socket instance
   * @param socketClientData - The socket client data
   * @param session - The session to cleanup
   * @param options - Options for cleanup behavior
   * @returns Promise<boolean> - True if the session was cleaned up successfully
   */
  async cleanupSocketSession(
    socket: Socket,
    socketClientData: SocketClientData,
    session: CustomContentSession,
    options: CleanupSocketSessionOptions = {},
  ): Promise<boolean> {
    const {
      shouldUnsetSession = true,
      shouldSetLastDismissedId = false,
      contentTypeFilter,
    } = options;
    const { clientConditions = [], waitTimers = [] } = socketClientData;
    const contentType = session.content.type;

    // Send WebSocket messages first if shouldUnsetSession is true, return false if any fails
    if (shouldUnsetSession && !(await this.unsetSocketSession(socket, session))) {
      return false;
    }

    // Emit condition cleanup efficiently
    const conditionChanges = await this.emitConditionCleanup(
      socket,
      clientConditions,
      waitTimers,
      contentTypeFilter,
    );

    // Update client data with session clearing and remaining conditions/timers
    // Now simplified as message queue ensures ordered execution
    const updatedClientData = {
      waitTimers: conditionChanges.remainingTimers,
      clientConditions: conditionChanges.clientConditions,
      ...(contentType === ContentDataType.FLOW && {
        ...(shouldSetLastDismissedId && { lastDismissedFlowId: session.content.id }),
        flowSession: undefined,
      }),
      ...(contentType === ContentDataType.CHECKLIST && {
        ...(shouldSetLastDismissedId && { lastDismissedChecklistId: session.content.id }),
        checklistSession: undefined,
      }),
    };

    return await this.socketClientDataService.set(socket.id, updatedClientData, true);
  }

  /**
   * Activate Flow session
   * @param socket - The socket
   * @param socketClientData - The socket client data
   * @param session - The Flow session to activate
   * @param options - Options for Flow activation behavior
   * @returns Promise<boolean> - True if the session was activated successfully
   */
  async activateFlowSession(
    socket: Socket,
    socketClientData: SocketClientData,
    session: CustomContentSession,
    options: ActivateFlowSessionOptions = {},
  ): Promise<boolean> {
    const { trackConditions = [], forceGoToStep = false, contentTypeFilter } = options;
    const { clientConditions = [], waitTimers = [] } = socketClientData;

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
    const conditionChanges = await this.emitConditionChanges(
      socket,
      clientConditions,
      waitTimers,
      trackConditions,
      contentTypeFilter,
    );

    // Update client data with Flow session and all condition changes
    const updatedClientData: Partial<SocketClientData> = {
      waitTimers: conditionChanges.remainingTimers,
      clientConditions: conditionChanges.clientConditions,
      flowSession: session,
      lastDismissedFlowId: undefined,
    };

    return await this.socketClientDataService.set(socket.id, updatedClientData, true);
  }

  /**
   * Activate Checklist session
   * @param socket - The socket
   * @param socketClientData - The socket client data
   * @param session - The Checklist session to activate
   * @param options - Options for Checklist activation behavior
   * @returns Promise<boolean> - True if the session was activated successfully
   */
  async activateChecklistSession(
    socket: Socket,
    socketClientData: SocketClientData,
    session: CustomContentSession,
    options: ActivateChecklistSessionOptions = {},
  ): Promise<boolean> {
    const { trackConditions = [], contentTypeFilter } = options;
    const { clientConditions = [], waitTimers = [] } = socketClientData;

    // Set Checklist session
    const isSetSession = await this.socketEmitterService.setChecklistSessionWithAck(
      socket,
      session,
    );
    if (!isSetSession) {
      return false;
    }

    // Emit condition changes efficiently
    const conditionChanges = await this.emitConditionChanges(
      socket,
      clientConditions,
      waitTimers,
      trackConditions,
      contentTypeFilter,
    );

    // Update client data with Checklist session and all condition changes
    const updatedClientData: Partial<SocketClientData> = {
      waitTimers: conditionChanges.remainingTimers,
      clientConditions: conditionChanges.clientConditions,
      checklistSession: session,
      lastDismissedChecklistId: undefined,
    };

    return await this.socketClientDataService.set(socket.id, updatedClientData, true);
  }

  /**
   * Track client conditions
   * @param socket - The socket
   * @param socketClientData - The socket client data
   * @param trackConditions - The conditions to track
   * @returns Promise<boolean> - True if the conditions were tracked successfully
   */
  async trackClientConditions(
    socket: Socket,
    socketClientData: SocketClientData,
    trackConditions: TrackCondition[],
  ): Promise<boolean> {
    const { clientConditions } = socketClientData;
    // Track the client conditions, because no content was found to start
    const newTrackConditions = trackConditions?.filter(
      (trackCondition) =>
        !clientConditions?.some(
          (clientCondition) => clientCondition.conditionId === trackCondition.condition.id,
        ),
    );
    if (newTrackConditions.length === 0) {
      return false;
    }
    const trackedConditions = await this.socketParallelService.trackClientConditions(
      socket,
      newTrackConditions,
    );

    // If not all conditions were tracked, log an error and return false
    if (trackedConditions.length !== newTrackConditions.length) {
      this.logger.error(
        `Failed to track all conditions: ${newTrackConditions.length} conditions to track,
         ${trackedConditions.length} conditions tracked`,
      );
      return false;
    }

    const newClientConditions = [...clientConditions, ...trackedConditions];

    return await this.socketClientDataService.set(
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
   * @param socketClientData - The socket client data
   * @param waitTimers - The wait timers to start
   * @returns Promise<boolean> - True if the wait timers were started successfully
   */
  async startConditionWaitTimers(
    socket: Socket,
    socketClientData: SocketClientData,
    waitTimers: ConditionWaitTimer[],
  ): Promise<boolean> {
    const { waitTimers: existingTimers = [] } = socketClientData;

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

    return await this.socketClientDataService.set(
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
