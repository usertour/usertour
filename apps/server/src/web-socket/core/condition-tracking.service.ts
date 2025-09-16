import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { TrackCondition } from '@/common/types/sdk';
import { SocketDataService, SocketClientData } from './socket-data.service';
import { SocketEmitterService } from './socket-emitter.service';

/**
 * Condition tracking service
 * Handles condition tracking lifecycle management
 * Focused on tracking, toggling, and untracking conditions
 */
@Injectable()
export class ConditionTrackingService {
  private readonly logger = new Logger(ConditionTrackingService.name);

  constructor(
    private readonly socketDataService: SocketDataService,
    private readonly socketEmitterService: SocketEmitterService,
  ) {}

  /**
   * Track socket conditions
   * @param socket - The socket
   * @param socketClientData - The socket client data
   * @param trackConditions - The conditions to track
   * @returns Promise<void>
   */
  async trackClientConditions(
    socket: Socket,
    socketClientData: SocketClientData,
    trackConditions: TrackCondition[],
  ): Promise<void> {
    try {
      // Early return if no conditions to track
      if (!trackConditions?.length) return;

      const existingClientConditions = socketClientData.clientConditions ?? [];

      // Filter out conditions that already exist
      const newConditions = trackConditions.filter(
        (condition) =>
          !existingClientConditions?.some(
            (existing) => existing.conditionId === condition.condition.id,
          ),
      );

      // Early return if no new conditions to track
      if (!newConditions.length) return;

      // Emit track events and collect successfully tracked conditions
      const trackedClientConditions = newConditions
        .filter((condition) => this.socketEmitterService.trackClientEvent(socket, condition))
        .map((condition) => ({
          conditionId: condition.condition.id,
          isActive: false,
        }));

      // Update socket data by merging with existing conditions
      await this.socketDataService.updateClientData(socket.id, {
        clientConditions: [...existingClientConditions, ...trackedClientConditions],
      });
    } catch (error) {
      this.logger.error(`Failed to track socket conditions for socket ${socket.id}:`, error);
    }
  }

  /**
   * Toggle specific socket condition
   * @param socket - The socket
   * @param socketClientData - The socket client data
   * @param conditionId - The condition ID
   * @param isActive - Whether the condition is active
   * @returns Promise<boolean> - True if the condition was toggled successfully
   */
  async toggleClientCondition(
    socket: Socket,
    socketClientData: SocketClientData,
    conditionId: string,
    isActive: boolean,
  ): Promise<boolean> {
    try {
      const clientConditions = socketClientData.clientConditions ?? [];

      // Early return if no conditions exist
      if (!clientConditions?.length) return false;

      // Check if condition exists first
      if (!clientConditions.some((c) => c.conditionId === conditionId)) {
        return false;
      }

      // Update the condition
      const updatedConditions = clientConditions.map((clientCondition) =>
        clientCondition.conditionId === conditionId
          ? {
              ...clientCondition,
              isActive,
            }
          : clientCondition,
      );

      // Update socket data
      await this.socketDataService.updateClientData(socket.id, {
        clientConditions: updatedConditions,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to toggle socket condition for socket ${socket.id}:`, error);
      return false;
    }
  }

  /**
   * Untrack current conditions with optional exclusions
   * @param socket - The socket
   * @param socketClientData - The socket client data
   * @param excludeConditionIds - Array of condition IDs to exclude from untracking
   * @returns Promise<void>
   */
  async untrackCurrentConditions(
    socket: Socket,
    socketClientData: SocketClientData,
    excludeConditionIds?: string[],
  ): Promise<void> {
    try {
      const clientConditions = socketClientData.clientConditions ?? [];

      // Early return if no existing conditions to remove
      if (!clientConditions?.length) return;

      // Determine which conditions to untrack
      const conditionsToUntrack = excludeConditionIds?.length
        ? clientConditions.filter((c) => !excludeConditionIds.includes(c.conditionId))
        : clientConditions;

      // Early return if no conditions to untrack
      if (!conditionsToUntrack.length) return;

      // Emit untrack events and collect successfully untracked conditions
      const untrackedConditions = conditionsToUntrack.filter((condition) =>
        this.socketEmitterService.untrackClientEvent(socket, condition.conditionId),
      );

      // Update socket data
      await this.socketDataService.updateClientData(socket.id, {
        clientConditions: clientConditions.filter(
          (condition) =>
            !untrackedConditions.some(
              (untracked) => untracked.conditionId === condition.conditionId,
            ),
        ),
      });
    } catch (error) {
      this.logger.error(`Failed to untrack socket conditions for socket ${socket.id}:`, error);
    }
  }
}
