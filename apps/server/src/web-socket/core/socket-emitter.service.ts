import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { CustomContentSession, TrackCondition, ConditionWaitTimer } from '@/common/types/sdk';
import { ServerMessageKind } from '@/web-socket/v2/web-socket-v2.dto';

/**
 * Socket emitter service
 * Handles all WebSocket event emissions to clients
 * Separated from data management for better testability and single responsibility
 */
@Injectable()
export class SocketEmitterService {
  private readonly logger = new Logger(SocketEmitterService.name);
  private readonly DEFAULT_TIMEOUT = 2000; // 2 seconds timeout for real-time communication
  private readonly SERVER_MESSAGE_EVENT = 'server-message';

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
    return await this.sendServerMessage(
      socket,
      ServerMessageKind.TRACK_CLIENT_CONDITION,
      condition,
    );
  }

  /**
   * Un-track a socket event
   * @param socket - The socket
   * @param conditionId - The condition id to un-track
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async untrackClientEvent(socket: Socket, conditionId: string): Promise<boolean> {
    return await this.sendServerMessage(socket, ServerMessageKind.UNTRACK_CLIENT_CONDITION, {
      conditionId,
    });
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
  async setFlowSession(socket: Socket, session: CustomContentSession): Promise<boolean> {
    return await this.sendServerMessage(socket, ServerMessageKind.SET_FLOW_SESSION, session);
  }

  /**
   * Set the checklist session
   * @param socket - The socket
   * @param session - The session to set
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async setChecklistSession(socket: Socket, session: CustomContentSession): Promise<boolean> {
    return await this.sendServerMessage(socket, ServerMessageKind.SET_CHECKLIST_SESSION, session);
  }

  /**
   * Unset the flow session
   * @param socket - The socket
   * @param sessionId - The session id to unset
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async unsetFlowSession(socket: Socket, sessionId: string): Promise<boolean> {
    return await this.sendServerMessage(socket, ServerMessageKind.UNSET_FLOW_SESSION, {
      sessionId,
    });
  }

  /**
   * Unset the checklist session
   * @param socket - The socket
   * @param sessionId - The session id to unset
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async unsetChecklistSession(socket: Socket, sessionId: string): Promise<boolean> {
    return await this.sendServerMessage(socket, ServerMessageKind.UNSET_CHECKLIST_SESSION, {
      sessionId,
    });
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
    return await this.sendServerMessage(socket, ServerMessageKind.FORCE_GO_TO_STEP, {
      sessionId,
      stepId,
    });
  }

  // ============================================================================
  // Checklist Control
  // ============================================================================

  /**
   * Checklist task completed
   * @param socket - The socket
   * @param taskId - The task id to complete
   * @returns True if the event was emitted successfully
   */
  checklistTaskCompleted(socket: Socket, taskId: string): boolean {
    // Fire-and-forget, no acknowledgment needed
    return socket.emit(this.SERVER_MESSAGE_EVENT, {
      kind: ServerMessageKind.CHECKLIST_TASK_COMPLETED,
      payload: { taskId },
      messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
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
    return await this.sendServerMessage(
      socket,
      ServerMessageKind.START_CONDITION_WAIT_TIMER,
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
    return await this.sendServerMessage(
      socket,
      ServerMessageKind.CANCEL_CONDITION_WAIT_TIMER,
      conditionWaitTimer,
    );
  }

  // ============================================================================
  // Generic Event Emission
  // ============================================================================

  /**
   * Send server message with unified format
   * @param socket - The socket
   * @param kind - The message kind
   * @param payload - The message payload
   * @param timeout - Timeout in milliseconds
   * @returns Promise<boolean> - True if the client successfully processed the message
   * @private
   */
  private async sendServerMessage(
    socket: Socket,
    kind: ServerMessageKind,
    payload?: any,
    timeout = this.DEFAULT_TIMEOUT,
  ): Promise<boolean> {
    try {
      const message = {
        kind,
        payload,
        messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      const success = await socket.timeout(timeout).emitWithAck(this.SERVER_MESSAGE_EVENT, message);
      if (!success) {
        this.logger.warn(`Client failed to process ${kind} for socket ${socket.id}`);
      }
      return !!success;
    } catch (error) {
      this.logger.error(`Failed to emit ${kind} for socket ${socket.id}:`, error);
      return false;
    }
  }

  /**
   * Emit a generic event to a socket with timeout and handle acknowledgment
   * @deprecated Use sendServerMessage instead
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
