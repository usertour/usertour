import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ClientCondition, TrackCondition, ConditionWaitTimer } from '@/common/types/sdk';
import { SocketEmitterService } from './socket-emitter.service';

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
  // Client Conditions
  // ============================================================================

  /**
   * Track multiple client conditions in parallel with acknowledgment
   * @param socket - The socket instance
   * @param trackConditions - Array of conditions to track
   * @returns Promise<ClientCondition[]> - Array of successfully tracked conditions
   */
  async trackClientConditions(
    socket: Socket,
    trackConditions: TrackCondition[],
  ): Promise<ClientCondition[]> {
    const operations = trackConditions.map(
      (condition) => () => this.socketEmitterService.trackClientEvent(socket, condition),
    );

    const successfulConditions = await this.executeParallelOperations(
      socket,
      operations,
      trackConditions,
      'trackClientConditions',
    );

    return successfulConditions.map((condition) => ({
      conditionId: condition.condition.id,
    }));
  }

  /**
   * Untrack client conditions
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
        this.socketEmitterService.untrackClientEvent(socket, condition.conditionId),
    );

    return await this.executeParallelOperations(
      socket,
      operations,
      clientConditions,
      'untrackClientConditions',
    );
  }

  // ============================================================================
  // Condition Wait Timers
  // ============================================================================

  /**
   * Start multiple wait timer conditions in parallel with acknowledgment
   * @param socket - The socket instance
   * @param conditionWaitTimers - Array of wait timer conditions to start
   * @returns Promise<ConditionWaitTimer[]> - Array of successfully started conditions
   */
  async startConditionWaitTimers(
    socket: Socket,
    conditionWaitTimers: ConditionWaitTimer[],
  ): Promise<ConditionWaitTimer[]> {
    const operations = conditionWaitTimers.map(
      (condition) => () => this.socketEmitterService.startConditionWaitTimer(socket, condition),
    );

    return await this.executeParallelOperations(
      socket,
      operations,
      conditionWaitTimers,
      'startConditionWaitTimers',
    );
  }

  /**
   * Cancel multiple wait timer conditions in parallel with acknowledgment
   * @param socket - The socket instance
   * @param conditionWaitTimers - Array of wait timer conditions to cancel
   * @returns Promise<ConditionWaitTimer[]> - Array of successfully cancelled conditions
   */
  async cancelConditionWaitTimers(
    socket: Socket,
    conditionWaitTimers: ConditionWaitTimer[],
  ): Promise<ConditionWaitTimer[]> {
    const operations = conditionWaitTimers.map(
      (condition) => () => this.socketEmitterService.cancelConditionWaitTimer(socket, condition),
    );

    return await this.executeParallelOperations(
      socket,
      operations,
      conditionWaitTimers,
      'cancelConditionWaitTimers',
    );
  }
}
