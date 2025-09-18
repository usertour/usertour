import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ConditionWaitTimer } from '@/common/types/sdk';
import { SocketDataService } from './socket-data.service';
import { SocketEmitterService } from './socket-emitter.service';

/**
 * Condition timer service
 * Handles condition timer management
 * Focused on starting, firing, and canceling condition timers
 */
@Injectable()
export class ConditionTimerService {
  private readonly logger = new Logger(ConditionTimerService.name);

  constructor(
    private readonly socketDataService: SocketDataService,
    private readonly socketEmitterService: SocketEmitterService,
  ) {}

  /**
   * Start multiple wait timer conditions in parallel with acknowledgment
   * @param socket - The socket instance
   * @param conditionWaitTimers - Array of wait timer conditions to start
   * @returns Promise<boolean> - True if all conditions were started and acknowledged
   */
  async startConditionWaitTimers(
    socket: Socket,
    conditionWaitTimers: ConditionWaitTimer[],
  ): Promise<boolean> {
    try {
      if (!conditionWaitTimers?.length) return false;

      // Process all conditions in parallel and wait for acknowledgments
      const results = await Promise.all(
        conditionWaitTimers.map((condition) =>
          this.socketEmitterService.startConditionWaitTimer(socket, condition),
        ),
      );

      // Filter conditions that were successfully acknowledged
      const updatedConditions = conditionWaitTimers.filter((_, index) => results[index]);

      // Update socket data with successfully started conditions
      return await this.socketDataService.updateClientData(socket.id, {
        conditionWaitTimers: updatedConditions,
      });
    } catch (error) {
      this.logger.error(`Failed to start wait timer conditions for socket ${socket.id}:`, error);
      return false;
    }
  }

  /**
   * Fire wait timer conditions
   * @param socket - The socket
   * @param conditionWaitTimers - The wait timer conditions to fire
   * @param fireVersionId - The version ID to fire
   * @returns Promise<boolean> - True if the condition was fired successfully
   */
  async fireConditionWaitTimer(
    socket: Socket,
    conditionWaitTimers: ConditionWaitTimer[],
    fireVersionId: string,
  ): Promise<boolean> {
    try {
      // Early return if no conditions exist
      if (!conditionWaitTimers?.length) return false;

      const targetCondition = conditionWaitTimers.find((c) => c.versionId === fireVersionId);
      // Check if condition exists first
      if (!targetCondition) {
        return false;
      }

      // Update the condition
      const updatedConditions = conditionWaitTimers.map((trackCondition) =>
        trackCondition.versionId === fireVersionId
          ? {
              ...trackCondition,
              activated: true,
            }
          : trackCondition,
      );

      // Update socket data
      return await this.socketDataService.updateClientData(socket.id, {
        conditionWaitTimers: updatedConditions,
      });
    } catch (error) {
      this.logger.error(
        `Failed to fire socket condition wait timer for socket ${socket.id}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Cancel multiple wait timer conditions in parallel with acknowledgment
   * @param socket - The socket instance
   * @param conditionWaitTimers - Array of wait timer conditions to cancel
   * @returns Promise<boolean> - True if all conditions were cancelled successfully
   */
  async cancelConditionWaitTimers(
    socket: Socket,
    conditionWaitTimers: ConditionWaitTimer[],
  ): Promise<boolean> {
    try {
      // Process all cancellations in parallel and wait for acknowledgments
      const results = await Promise.all(
        conditionWaitTimers.map((condition) =>
          this.socketEmitterService.cancelConditionWaitTimer(socket, condition),
        ),
      );

      // Check if all cancellations were successful
      const allCancelled = results.every((success) => success);
      if (!allCancelled) {
        this.logger.warn(`Some wait timer conditions failed to cancel for socket ${socket.id}`);
      }

      // Clear all wait timer conditions from socket data
      return await this.socketDataService.updateClientData(socket.id, {
        conditionWaitTimers: [],
      });
    } catch (error) {
      this.logger.error(`Failed to cancel wait timer conditions for socket ${socket.id}:`, error);
      return false;
    }
  }
}
