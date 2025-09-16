import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { WaitTimerCondition } from '@/common/types/sdk';
import { SocketDataService, SocketClientData } from './socket-data.service';
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
   * @param socketClientData - The socket client data
   * @param startConditions - The conditions to start
   * @returns Promise<boolean> - True if the conditions were started successfully
   */
  async startWaitTimerConditions(
    socket: Socket,
    socketClientData: SocketClientData,
    startConditions: WaitTimerCondition[],
  ): Promise<boolean> {
    try {
      // Early return if no conditions to start
      if (!startConditions?.length) return false;

      const existingConditions = socketClientData.waitTimerConditions ?? [];

      // Filter out conditions that already exist
      const newConditions = startConditions.filter(
        (condition) =>
          !existingConditions?.some((existing) => existing.versionId === condition.versionId),
      );

      // Early return if no new conditions to start
      if (!newConditions.length) return false;

      // Emit start events and collect successfully started conditions
      const startedConditions = newConditions.filter((condition) =>
        this.socketEmitterService.startConditionWaitTimer(socket, condition),
      );

      // Update socket data by merging with existing conditions
      return await this.socketDataService.updateClientData(socket.id, {
        waitTimerConditions: [...existingConditions, ...startedConditions],
      });
    } catch (error) {
      this.logger.error(`Failed to start wait timer conditions for socket ${socket.id}:`, error);
      return false;
    }
  }

  /**
   * Fire wait timer conditions
   * @param socket - The socket
   * @param socketClientData - The socket client data
   * @param versionId - The version ID
   * @returns Promise<boolean> - True if the condition was fired successfully
   */
  async fireWaitTimerCondition(
    socket: Socket,
    socketClientData: SocketClientData,
    versionId: string,
  ): Promise<boolean> {
    try {
      const waitTimerConditions = socketClientData.waitTimerConditions ?? [];

      // Early return if no conditions exist
      if (!waitTimerConditions?.length) return false;

      const targetCondition = waitTimerConditions.find((c) => c.versionId === versionId);
      // Check if condition exists first
      if (!targetCondition) {
        return false;
      }

      // Update the condition
      const updatedConditions = waitTimerConditions.map((trackCondition) =>
        trackCondition.versionId === versionId
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
   * @param socketClientData - The socket client data
   * @returns Promise<boolean> - True if the conditions were cancelled successfully
   */
  async cancelWaitTimerConditions(
    socket: Socket,
    socketClientData: SocketClientData,
  ): Promise<boolean> {
    try {
      if (!socketClientData) return true;

      const waitTimerConditions = socketClientData.waitTimerConditions ?? [];

      // Early return if no existing conditions to remove
      if (!waitTimerConditions?.length) return true;

      // Filter out already activated conditions and emit cancellation events
      const conditionsToCancel = waitTimerConditions.filter((condition) => !condition.activated);

      // Emit cancellation events for non-activated conditions
      for (const condition of conditionsToCancel) {
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
