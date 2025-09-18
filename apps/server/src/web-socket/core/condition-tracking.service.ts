import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ClientCondition, TrackCondition } from '@/common/types/sdk';
import { SocketDataService } from './socket-data.service';
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
   * Track multiple client conditions in parallel with acknowledgment
   * @param socket - The socket instance
   * @param trackConditions - Array of conditions to track
   * @returns Promise<boolean> - True if all conditions were tracked and acknowledged
   */
  async trackClientConditions(socket: Socket, trackConditions: TrackCondition[]): Promise<boolean> {
    try {
      // Early return if no conditions to track
      if (!trackConditions?.length) return false;

      // Process all conditions in parallel and wait for acknowledgments
      const results = await Promise.all(
        trackConditions.map((condition) =>
          this.socketEmitterService.trackClientEvent(socket, condition),
        ),
      );

      // Filter conditions that were successfully acknowledged
      const clientConditions = trackConditions
        .filter((_, index) => results[index])
        .map((condition) => ({
          conditionId: condition.condition.id,
          isActive: false,
        }));

      // Update socket data with successfully tracked conditions
      return await this.socketDataService.updateClientData(socket.id, {
        clientConditions,
      });
    } catch (error) {
      this.logger.error(`Failed to track socket conditions for socket ${socket.id}:`, error);
      return false;
    }
  }

  /**
   * Toggle specific socket condition
   * @param socket - The socket
   * @param clientConditions - The client conditions to toggle
   * @param conditionId - The condition ID
   * @param isActive - Whether the condition is active
   * @returns Promise<boolean> - True if the condition was toggled successfully
   */
  async toggleClientCondition(
    socket: Socket,
    clientConditions: ClientCondition[],
    conditionId: string,
    isActive: boolean,
  ): Promise<boolean> {
    try {
      // Check if condition exists
      if (!clientConditions?.some((c) => c.conditionId === conditionId)) {
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
      return await this.socketDataService.updateClientData(socket.id, {
        clientConditions: updatedConditions,
      });
    } catch (error) {
      this.logger.error(`Failed to toggle socket condition for socket ${socket.id}:`, error);
      return false;
    }
  }

  /**
   * Untrack client conditions
   * @param socket - The socket
   * @param clientConditions - The client conditions to untrack
   * @returns Promise<boolean> - True if the conditions were untracked successfully
   */
  async untrackClientConditions(
    socket: Socket,
    clientConditions: ClientCondition[],
  ): Promise<boolean> {
    try {
      // Early return if no conditions to untrack
      if (!clientConditions?.length) return false;

      // Emit untrack events in parallel and await acknowledgments
      const results = await Promise.all(
        clientConditions.map((condition) =>
          this.socketEmitterService.untrackClientEvent(socket, condition.conditionId),
        ),
      );

      // Keep only conditions that were not acknowledged as untracked
      const remainingConditions = clientConditions.filter((_, index) => !results[index]);

      // Update socket data
      return await this.socketDataService.updateClientData(socket.id, {
        clientConditions: remainingConditions,
      });
    } catch (error) {
      this.logger.error(`Failed to untrack socket conditions for socket ${socket.id}:`, error);
      return false;
    }
  }
}
