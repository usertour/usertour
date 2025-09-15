import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SDKContentSession, TrackCondition, WaitTimerCondition } from '@/common/types/sdk';

/**
 * Socket emitter service
 * Handles all WebSocket event emissions to clients
 * Separated from data management for better testability and single responsibility
 */
@Injectable()
export class SocketEmitterService {
  private readonly logger = new Logger(SocketEmitterService.name);

  // ============================================================================
  // Client Event Tracking
  // ============================================================================

  /**
   * Track a socket event
   * @param socket - The socket
   * @param condition - The condition to emit
   * @returns boolean - True if the event was emitted successfully
   */
  trackClientEvent(socket: Socket, condition: TrackCondition): boolean {
    return this.emitEvent(socket, 'track-client-condition', condition);
  }

  /**
   * Un-track a socket event
   * @param socket - The socket
   * @param conditionId - The condition id to un-track
   * @returns boolean - True if the event was emitted successfully
   */
  untrackClientEvent(socket: Socket, conditionId: string): boolean {
    return this.emitEvent(socket, 'untrack-client-condition', { conditionId });
  }

  // ============================================================================
  // Content Session Management
  // ============================================================================

  /**
   * Set the flow session
   * @param socket - The socket
   * @param session - The session to set
   * @returns boolean - True if the event was emitted successfully
   */
  setFlowSession(socket: Socket, session: SDKContentSession): boolean {
    return this.emitEvent(socket, 'set-flow-session', session);
  }

  /**
   * Set the checklist session
   * @param socket - The socket
   * @param session - The session to set
   * @returns boolean - True if the event was emitted successfully
   */
  setChecklistSession(socket: Socket, session: SDKContentSession): boolean {
    return this.emitEvent(socket, 'set-checklist-session', session);
  }

  /**
   * Unset the flow session
   * @param socket - The socket
   * @param sessionId - The session id to unset
   * @returns boolean - True if the event was emitted successfully
   */
  unsetFlowSession(socket: Socket, sessionId: string): boolean {
    return this.emitEvent(socket, 'unset-flow-session', { sessionId });
  }

  /**
   * Unset the checklist session
   * @param socket - The socket
   * @param sessionId - The session id to unset
   * @returns boolean - True if the event was emitted successfully
   */
  unsetChecklistSession(socket: Socket, sessionId: string): boolean {
    return this.emitEvent(socket, 'unset-checklist-session', { sessionId });
  }

  // ============================================================================
  // Flow Control
  // ============================================================================

  /**
   * Force go to step
   * @param socket - The socket
   * @param sessionId - The session id to force go to step
   * @param stepId - The step id to force go to step
   * @returns boolean - True if the event was emitted successfully
   */
  forceGoToStep(socket: Socket, sessionId: string, stepId: string): boolean {
    return this.emitEvent(socket, 'force-go-to-step', { sessionId, stepId });
  }

  // ============================================================================
  // Wait Timer Conditions
  // ============================================================================

  /**
   * Start condition wait timer
   * @param socket - The socket
   * @param waitTimerCondition - The wait timer condition to start
   * @returns boolean - True if the event was emitted successfully
   */
  startConditionWaitTimer(socket: Socket, waitTimerCondition: WaitTimerCondition): boolean {
    return this.emitEvent(socket, 'start-condition-wait-timer', waitTimerCondition);
  }

  /**
   * Cancel condition wait timer
   * @param socket - The socket
   * @param waitTimerCondition - The wait timer condition to cancel
   * @returns boolean - True if the event was emitted successfully
   */
  cancelConditionWaitTimer(socket: Socket, waitTimerCondition: WaitTimerCondition): boolean {
    return this.emitEvent(socket, 'cancel-condition-wait-timer', waitTimerCondition);
  }

  // ============================================================================
  // Generic Event Emission
  // ============================================================================

  /**
   * Emit a generic event to a socket
   * @param socket - The socket
   * @param eventName - The event name
   * @param data - The data to emit
   * @returns boolean - True if the event was emitted successfully
   * @private
   */
  private emitEvent(socket: Socket, eventName: string, data?: any): boolean {
    try {
      socket.emit(eventName, data);
      return true;
    } catch (error) {
      this.logger.error(`Failed to emit ${eventName} for socket ${socket.id}:`, error);
      return false;
    }
  }

  /**
   * Emit an event to multiple sockets
   * @param sockets - Array of sockets
   * @param eventName - The event name
   * @param data - The data to emit
   * @returns number - Number of successful emissions
   * @private
   */
  private emitToMultipleSockets(sockets: Socket[], eventName: string, data?: any): number {
    let successCount = 0;
    for (const socket of sockets) {
      if (this.emitEvent(socket, eventName, data)) {
        successCount++;
      }
    }
    return successCount;
  }
}
