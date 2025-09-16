import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { WaitTimerCondition } from '@/common/types/sdk';
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
   * Start wait timer conditions
   * @param socket - The socket
   * @param waitTimerConditions - The wait timer conditions to start
   * @returns Promise<boolean> - True if the conditions were started successfully
   */
  async startConditionWaitTimers(
    socket: Socket,
    waitTimerConditions: WaitTimerCondition[],
  ): Promise<boolean> {
    try {
      // Early return if no conditions to start
      if (!waitTimerConditions?.length) return false;

      // Emit start events and collect successfully started conditions
      const updatedConditions = waitTimerConditions.filter((condition) =>
        this.socketEmitterService.startConditionWaitTimer(socket, condition),
      );

      // Update socket data by merging with existing conditions
      return await this.socketDataService.updateClientData(socket.id, {
        waitTimerConditions: updatedConditions,
      });
    } catch (error) {
      this.logger.error(`Failed to start wait timer conditions for socket ${socket.id}:`, error);
      return false;
    }
  }

  /**
   * Fire wait timer conditions
   * @param socket - The socket
   * @param waitTimerConditions - The wait timer conditions to fire
   * @param fireVersionId - The version ID to fire
   * @returns Promise<boolean> - True if the condition was fired successfully
   */
  async fireConditionWaitTimer(
    socket: Socket,
    waitTimerConditions: WaitTimerCondition[],
    fireVersionId: string,
  ): Promise<boolean> {
    try {
      // Early return if no conditions exist
      if (!waitTimerConditions?.length) return false;

      const targetCondition = waitTimerConditions.find((c) => c.versionId === fireVersionId);
      // Check if condition exists first
      if (!targetCondition) {
        return false;
      }

      // Update the condition
      const updatedConditions = waitTimerConditions.map((trackCondition) =>
        trackCondition.versionId === fireVersionId
          ? {
              ...trackCondition,
              activated: true,
            }
          : trackCondition,
      );

      // Update socket data
      return await this.socketDataService.updateClientData(socket.id, {
        waitTimerConditions: updatedConditions,
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
   * Cancel wait timer conditions
   * @param socket - The socket
   * @param waitTimerConditions - The wait timer conditions to cancel
   * @returns Promise<boolean> - True if the conditions were cancelled successfully
   */
  async cancelConditionWaitTimers(
    socket: Socket,
    waitTimerConditions: WaitTimerCondition[],
  ): Promise<boolean> {
    try {
      // Emit cancellation events for non-activated conditions
      for (const condition of waitTimerConditions) {
        this.socketEmitterService.cancelConditionWaitTimer(socket, condition);
      }

      // Clear all wait timer conditions from socket data
      return await this.socketDataService.updateClientData(socket.id, { waitTimerConditions: [] });
    } catch (error) {
      this.logger.error(`Failed to cancel wait timer conditions for socket ${socket.id}:`, error);
      return false;
    }
  }
}
