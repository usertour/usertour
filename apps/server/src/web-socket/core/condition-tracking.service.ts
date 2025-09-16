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
   * Track socket conditions
   * @param socket - The socket
   * @param trackConditions - The conditions to track
   * @returns Promise<void>
   */
  async trackClientConditions(socket: Socket, trackConditions: TrackCondition[]): Promise<boolean> {
    try {
      // Early return if no conditions to track
      if (!trackConditions?.length) return false;

      // Emit track events and collect successfully tracked conditions
      const clientConditions = trackConditions
        .filter((condition) => this.socketEmitterService.trackClientEvent(socket, condition))
        .map((condition) => ({
          conditionId: condition.condition.id,
          isActive: false,
        }));

      // Update socket data by merging with existing conditions
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

      // Emit untrack events and collect successfully untracked conditions
      const untrackedConditions = clientConditions.filter((condition) =>
        this.socketEmitterService.untrackClientEvent(socket, condition.conditionId),
      );

      // Update socket data
      return await this.socketDataService.updateClientData(socket.id, {
        clientConditions: clientConditions.filter(
          (condition) =>
            !untrackedConditions.some(
              (untracked) => untracked.conditionId === condition.conditionId,
            ),
        ),
      });
    } catch (error) {
      this.logger.error(`Failed to untrack socket conditions for socket ${socket.id}:`, error);
      return false;
    }
  }
}
