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
} from '@/utils/websocket-utils';
import { SocketRedisService } from './socket-redis.service';

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

export interface ActivateSocketSessionOptions {
  /** The conditions to track */
  trackConditions?: TrackCondition[];
  /** Whether to force go to step, defaults to false */
  forceGoToStep?: boolean;
  /** Optional array of content types to filter client conditions by */
  contentTypeFilter?: ContentDataType[];
}

interface ConditionChangesResult {
  clientConditions: ClientCondition[];
  untrackedConditions: ClientCondition[];
  remainingTimers: ConditionWaitTimer[];
}

/**
 * Content session manager service
 * Handles content session management for Flow and Checklist content types
 * Focused on session lifecycle management, data persistence, and WebSocket communication
 * Delegates session creation and manipulation to SessionBuilderService
 */
@Injectable()
export class SocketSessionService {
  private readonly logger = new Logger(SocketSessionService.name);

  constructor(
    private readonly socketEmitterService: SocketEmitterService,
    private readonly socketParallelService: SocketParallelService,
    private readonly socketRedisService: SocketRedisService,
  ) {}

  /**
   * Emit set socket session event with acknowledgment
   * @param socket - The socket instance
   * @param session - The session data to set
   * @returns Promise<boolean> - True if the session was set and acknowledged by client
   */
  private async setSocketSession(socket: Socket, session: CustomContentSession): Promise<boolean> {
    const contentType = session.content.type as ContentDataType;

    switch (contentType) {
      case ContentDataType.FLOW:
        return await this.socketEmitterService.setFlowSession(socket, session);
      case ContentDataType.CHECKLIST:
        return await this.socketEmitterService.setChecklistSession(socket, session);
      default:
        this.logger.warn(`Unsupported content type: ${contentType}`);
        return false;
    }
  }

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
        return await this.socketEmitterService.unsetFlowSession(socket, sessionId);
      case ContentDataType.CHECKLIST:
        return await this.socketEmitterService.unsetChecklistSession(socket, sessionId);
      default:
        this.logger.warn(`Unsupported content type: ${contentType}`);
        return false;
    }
  }

  /**
   * Emit checklist task completed event
   * @param socket - The socket instance
   * @param taskIds - The task ids to complete
   * @returns True if the event was emitted successfully
   */
  async emitChecklistTasksCompleted(socket: Socket, taskIds: string[]) {
    for (const taskId of taskIds) {
      this.socketEmitterService.checklistTaskCompleted(socket, taskId);
    }
    return true;
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
    const { filteredConditions, preservedConditions: preservedClientConditions } =
      filterAndPreserveConditions(clientConditions, contentTypeFilter);

    // Process condition cleanup operations in parallel
    const [untrackedConditions, cancelledTimers] = await Promise.all([
      this.socketParallelService.untrackClientConditions(socket, filteredConditions),
      this.socketParallelService.cancelConditionWaitTimers(socket, waitTimers),
    ]);

    // Calculate remaining conditions and timers (those that failed to process)
    const remainingConditions = calculateRemainingClientConditions(
      filteredConditions,
      untrackedConditions,
    );
    const remainingTimers = calculateRemainingConditionWaitTimers(waitTimers, cancelledTimers);

    return {
      clientConditions: [...remainingConditions, ...preservedClientConditions],
      untrackedConditions,
      remainingTimers,
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
      untrackedConditions,
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

    return await this.socketRedisService.updateClientData(socket.id, updatedClientData);
  }

  /**
   * Activate socket session
   * @param socket - The socket
   * @param socketClientData - The socket client data
   * @param session - The session to activate
   * @param options - Options for activation behavior
   * @returns Promise<boolean> - True if the session was activated successfully
   */
  async activateSocketSession(
    socket: Socket,
    socketClientData: SocketClientData,
    session: CustomContentSession,
    options: ActivateSocketSessionOptions = {},
  ): Promise<boolean> {
    const { trackConditions = [], forceGoToStep = false, contentTypeFilter } = options;
    const { clientConditions = [], waitTimers = [] } = socketClientData;
    const isSetSession = await this.setSocketSession(socket, session);
    const contentType = session.content.type as ContentDataType;
    if (!isSetSession) {
      return false;
    }
    if (forceGoToStep && session.currentStep?.id) {
      await this.socketEmitterService.forceGoToStep(socket, session.id, session.currentStep.id);
    }

    // Emit condition changes efficiently
    const conditionChanges = await this.emitConditionChanges(
      socket,
      clientConditions,
      waitTimers,
      trackConditions,
      contentTypeFilter,
    );

    // Update client data with session and all condition changes
    // Now simplified as message queue ensures ordered execution
    const updatedClientData: Partial<SocketClientData> = {
      waitTimers: conditionChanges.remainingTimers,
      clientConditions: conditionChanges.clientConditions,
      ...(contentType === ContentDataType.FLOW && {
        flowSession: session,
        lastDismissedFlowId: undefined,
      }),
      ...(contentType === ContentDataType.CHECKLIST && {
        checklistSession: session,
        lastDismissedChecklistId: undefined,
      }),
    };

    return await this.socketRedisService.updateClientData(socket.id, updatedClientData);
  }
}
