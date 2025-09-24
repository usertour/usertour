import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ClientCondition, TrackCondition, ConditionWaitTimer } from '@/common/types/sdk';
import { SocketEmitterService } from './socket-emitter.service';

/**
 * Condition emitter service
 * Handles condition-related WebSocket event emissions
 * Focused on tracking, untracking, starting, and canceling conditions
 */
@Injectable()
export class ConditionEmitterService {
  private readonly logger = new Logger(ConditionEmitterService.name);

  constructor(private readonly socketEmitterService: SocketEmitterService) {}

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
    try {
      // Early return if no conditions to track
      if (!trackConditions?.length) return [];

      // Process all conditions in parallel and wait for acknowledgments
      const results = await Promise.all(
        trackConditions.map((condition) =>
          this.socketEmitterService.trackClientEvent(socket, condition),
        ),
      );

      // Filter conditions that were successfully acknowledged
      return trackConditions
        .filter((_, index) => results[index])
        .map((condition) => ({
          conditionId: condition.condition.id,
        }));
    } catch (error) {
      this.logger.error(`Failed to track socket conditions for socket ${socket.id}:`, error);
      return [];
    }
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
    try {
      // Early return if no conditions to untrack
      if (!clientConditions?.length) return [];

      // Emit untrack events in parallel and await acknowledgments
      const results = await Promise.all(
        clientConditions.map((condition) =>
          this.socketEmitterService.untrackClientEvent(socket, condition.conditionId),
        ),
      );

      // Return only conditions that were successfully untracked
      return clientConditions.filter((_, index) => results[index]);
    } catch (error) {
      this.logger.error(`Failed to untrack socket conditions for socket ${socket.id}:`, error);
      return [];
    }
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
    try {
      if (!conditionWaitTimers?.length) return [];

      // Process all conditions in parallel and wait for acknowledgments
      const results = await Promise.all(
        conditionWaitTimers.map((condition) =>
          this.socketEmitterService.startConditionWaitTimer(socket, condition),
        ),
      );

      // Return only conditions that were successfully started
      return conditionWaitTimers.filter((_, index) => results[index]);
    } catch (error) {
      this.logger.error(`Failed to start wait timer conditions for socket ${socket.id}:`, error);
      return [];
    }
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
    try {
      if (!conditionWaitTimers?.length) return [];
      // Process all cancellations in parallel and wait for acknowledgments
      const results = await Promise.all(
        conditionWaitTimers.map((condition) =>
          this.socketEmitterService.cancelConditionWaitTimer(socket, condition),
        ),
      );

      // Return only conditions that were successfully cancelled
      return conditionWaitTimers.filter((_, index) => results[index]);
    } catch (error) {
      this.logger.error(`Failed to cancel wait timer conditions for socket ${socket.id}:`, error);
      return [];
    }
  }
}
