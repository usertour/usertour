import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SDKContentSession, TrackCondition, ConditionWaitTimer } from '@/common/types/sdk';

/**
 * Socket emitter service
 * Handles all WebSocket event emissions to clients
 * Separated from data management for better testability and single responsibility
 */
@Injectable()
export class SocketEmitterService {
  private readonly logger = new Logger(SocketEmitterService.name);
  private readonly DEFAULT_TIMEOUT = 2000; // 2 seconds timeout for real-time communication

  // ============================================================================
  // Client Event Tracking
  // ============================================================================

  /**
   * Track a socket event
   * @param socket - The socket
   * @param condition - The condition to emit
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async trackClientEvent(socket: Socket, condition: TrackCondition): Promise<boolean> {
    return await this.emitEventWithTimeout(socket, 'track-client-condition', condition);
  }

  /**
   * Un-track a socket event
   * @param socket - The socket
   * @param conditionId - The condition id to un-track
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async untrackClientEvent(socket: Socket, conditionId: string): Promise<boolean> {
    return await this.emitEventWithTimeout(socket, 'untrack-client-condition', { conditionId });
  }

  // ============================================================================
  // Content Session Management
  // ============================================================================

  /**
   * Set the flow session
   * @param socket - The socket
   * @param session - The session to set
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async setFlowSession(socket: Socket, session: SDKContentSession): Promise<boolean> {
    return await this.emitEventWithTimeout(socket, 'set-flow-session', session);
  }

  /**
   * Set the checklist session
   * @param socket - The socket
   * @param session - The session to set
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async setChecklistSession(socket: Socket, session: SDKContentSession): Promise<boolean> {
    return await this.emitEventWithTimeout(socket, 'set-checklist-session', session);
  }

  /**
   * Unset the flow session
   * @param socket - The socket
   * @param sessionId - The session id to unset
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async unsetFlowSession(socket: Socket, sessionId: string): Promise<boolean> {
    return await this.emitEventWithTimeout(socket, 'unset-flow-session', { sessionId });
  }

  /**
   * Unset the checklist session
   * @param socket - The socket
   * @param sessionId - The session id to unset
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async unsetChecklistSession(socket: Socket, sessionId: string): Promise<boolean> {
    return await this.emitEventWithTimeout(socket, 'unset-checklist-session', { sessionId });
  }

  // ============================================================================
  // Flow Control
  // ============================================================================

  /**
   * Force go to step
   * @param socket - The socket
   * @param sessionId - The session id to force go to step
   * @param stepId - The step id to force go to step
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async forceGoToStep(socket: Socket, sessionId: string, stepId: string): Promise<boolean> {
    return await this.emitEventWithTimeout(socket, 'force-go-to-step', { sessionId, stepId });
  }

  // ============================================================================
  // Wait Timer Conditions
  // ============================================================================

  /**
   * Start condition wait timer
   * @param socket - The socket
   * @param conditionWaitTimer - The wait timer condition to start
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async startConditionWaitTimer(
    socket: Socket,
    conditionWaitTimer: ConditionWaitTimer,
  ): Promise<boolean> {
    return await this.emitEventWithTimeout(
      socket,
      'start-condition-wait-timer',
      conditionWaitTimer,
    );
  }

  /**
   * Cancel condition wait timer
   * @param socket - The socket
   * @param conditionWaitTimer - The wait timer condition to cancel
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async cancelConditionWaitTimer(
    socket: Socket,
    conditionWaitTimer: ConditionWaitTimer,
  ): Promise<boolean> {
    return await this.emitEventWithTimeout(
      socket,
      'cancel-condition-wait-timer',
      conditionWaitTimer,
    );
  }

  // ============================================================================
  // Generic Event Emission
  // ============================================================================

  /**
   * Emit a generic event to a socket with timeout and handle acknowledgment
   * @param socket - The socket
   * @param eventName - The event name
   * @param data - The data to emit
   * @param timeout - Timeout in milliseconds (default: 5000)
   * @returns Promise<boolean> - True if the client successfully processed the event
   * @private
   */
  private async emitEventWithTimeout(
    socket: Socket,
    eventName: string,
    data?: any,
    timeout = this.DEFAULT_TIMEOUT,
  ): Promise<boolean> {
    try {
      const success = await socket.timeout(timeout).emitWithAck(eventName, data);
      if (!success) {
        this.logger.warn(`Client failed to process ${eventName} for socket ${socket.id}`);
      }
      return !!success;
    } catch (error) {
      this.logger.error(`Failed to emit ${eventName} for socket ${socket.id}:`, error);
      return false;
    }
  }

  /**
   * Emit an event to multiple sockets with timeout
   * @param sockets - Array of sockets
   * @param eventName - The event name
   * @param data - The data to emit
   * @returns Promise<number> - Number of successful emissions
   * @private
   */
  private async emitToMultipleSockets(
    sockets: Socket[],
    eventName: string,
    data?: any,
  ): Promise<number> {
    let successCount = 0;
    for (const socket of sockets) {
      if (await this.emitEventWithTimeout(socket, eventName, data)) {
        successCount++;
      }
    }
    return successCount;
  }
}
