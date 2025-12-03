import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import {
  ClientCondition,
  TrackCondition,
  ConditionWaitTimer,
  CustomContentSession,
} from '@usertour/types';
import { SocketEmitterService } from './socket-emitter.service';

// ============================================================================
// Socket Parallel Service
// ============================================================================

/**
 * Socket parallel service
 * Handles parallel WebSocket event emissions with acknowledgment
 * Provides generic parallel processing capabilities for various socket operations
 */
@Injectable()
export class SocketParallelService {
  private readonly logger = new Logger(SocketParallelService.name);

  constructor(private readonly socketEmitterService: SocketEmitterService) {}

  // ============================================================================
  // Generic Parallel Processing
  // ============================================================================

  /**
   * Generic method to execute multiple socket operations in parallel
   * @param socket - The socket instance
   * @param operations - Array of operations to execute
   * @param items - Array of items corresponding to operations
   * @param operationName - Name of the operation for logging
   * @returns Promise<T[]> - Array of successfully processed items
   */
  private async executeParallelOperations<T>(
    socket: Socket,
    operations: Array<() => Promise<boolean>>,
    items: T[],
    operationName: string,
  ): Promise<T[]> {
    try {
      if (!operations?.length || !items?.length) return [];

      // Execute all operations in parallel - call each function to get the Promise
      const results = await Promise.all(operations.map((operation) => operation()));

      // Filter items that were successfully processed
      const successfulItems = items.filter((_, index) => results[index]);

      this.logger.debug(
        `${operationName}: ${successfulItems.length}/${items.length} operations successful for socket ${socket.id}`,
      );

      return successfulItems;
    } catch (error) {
      this.logger.error(`Failed to execute ${operationName} for socket ${socket.id}:`, error);
      return [];
    }
  }

  // ============================================================================
  // Client Conditions Operations
  // ============================================================================

  /**
   * Track multiple client conditions in parallel with acknowledgment
   * @param socket - The socket instance
   * @param trackConditions - Array of conditions to track
   * @returns Promise<TrackCondition[]> - Array of successfully tracked conditions
   */
  async trackClientConditions(
    socket: Socket,
    trackConditions: TrackCondition[],
  ): Promise<TrackCondition[]> {
    const operations = trackConditions.map(
      (condition) => () => this.socketEmitterService.trackClientEventWithAck(socket, condition),
    );

    return await this.executeParallelOperations(
      socket,
      operations,
      trackConditions,
      'trackClientConditions',
    );
  }

  /**
   * Untrack client conditions in parallel with acknowledgment
   * @param socket - The socket
   * @param clientConditions - The client conditions to untrack
   * @returns Promise<ClientCondition[]> - Array of successfully untracked conditions
   */
  async untrackClientConditions(
    socket: Socket,
    clientConditions: ClientCondition[],
  ): Promise<ClientCondition[]> {
    const operations = clientConditions.map(
      (condition) => () =>
        this.socketEmitterService.untrackClientEventWithAck(socket, condition.conditionId),
    );

    return await this.executeParallelOperations(
      socket,
      operations,
      clientConditions,
      'untrackClientConditions',
    );
  }

  // ============================================================================
  // Condition Wait Timers Operations
  // ============================================================================

  /**
   * Start multiple wait timer conditions in parallel with acknowledgment
   * @param socket - The socket instance
   * @param waitTimers - Array of wait timer conditions to start
   * @returns Promise<ConditionWaitTimer[]> - Array of successfully started conditions
   */
  async startConditionWaitTimers(
    socket: Socket,
    waitTimers: ConditionWaitTimer[],
  ): Promise<ConditionWaitTimer[]> {
    const operations = waitTimers.map(
      (condition) => () =>
        this.socketEmitterService.startConditionWaitTimerWithAck(socket, condition),
    );

    return await this.executeParallelOperations(
      socket,
      operations,
      waitTimers,
      'startConditionWaitTimers',
    );
  }

  /**
   * Cancel multiple wait timer conditions in parallel with acknowledgment
   * @param socket - The socket instance
   * @param waitTimers - Array of wait timer conditions to cancel
   * @returns Promise<ConditionWaitTimer[]> - Array of successfully cancelled conditions
   */
  async cancelConditionWaitTimers(
    socket: Socket,
    waitTimers: ConditionWaitTimer[],
  ): Promise<ConditionWaitTimer[]> {
    const operations = waitTimers.map(
      (condition) => () =>
        this.socketEmitterService.cancelConditionWaitTimerWithAck(socket, condition),
    );

    return await this.executeParallelOperations(
      socket,
      operations,
      waitTimers,
      'cancelConditionWaitTimers',
    );
  }

  // ============================================================================
  // Launcher Operations
  // ============================================================================

  /**
   * Add multiple launcher sessions in parallel with acknowledgment
   * @param socket - The socket instance
   * @param launcherSessions - Array of launcher sessions to add
   * @returns Promise<CustomContentSession[]> - Array of successfully added sessions
   */
  async addLaunchers(
    socket: Socket,
    launcherSessions: CustomContentSession[],
  ): Promise<CustomContentSession[]> {
    const operations = launcherSessions.map(
      (session) => () => this.socketEmitterService.addLauncherWithAck(socket, session),
    );

    return await this.executeParallelOperations(
      socket,
      operations,
      launcherSessions,
      'addLaunchers',
    );
  }

  /**
   * Remove multiple launcher sessions in parallel with acknowledgment
   * @param socket - The socket instance
   * @param contentIds - Array of content ids to remove
   * @returns Promise<string[]> - Array of successfully removed content ids
   */
  async removeLaunchers(socket: Socket, contentIds: string[]): Promise<string[]> {
    const operations = contentIds.map(
      (contentId) => () => this.socketEmitterService.removeLauncherWithAck(socket, contentId),
    );

    return await this.executeParallelOperations(socket, operations, contentIds, 'removeLaunchers');
  }
}
