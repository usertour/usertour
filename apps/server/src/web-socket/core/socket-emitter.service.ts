import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import {
  ServerMessageKind,
  CustomContentSession,
  TrackCondition,
  ConditionWaitTimer,
} from '@usertour/types';
import { uuidV4 } from '@usertour/helpers';

// ============================================================================
// Socket Emitter Service
// ============================================================================

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
  // Public API Methods - Client Event Tracking
  // ============================================================================

  /**
   * Track a socket event
   * @param socket - The socket
   * @param condition - The condition to emit
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async trackClientEventWithAck(socket: Socket, condition: TrackCondition): Promise<boolean> {
    return await this.emitWithAck(socket, ServerMessageKind.TRACK_CLIENT_CONDITION, condition);
  }

  /**
   * Un-track a socket event
   * @param socket - The socket
   * @param conditionId - The condition id to un-track
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async untrackClientEventWithAck(socket: Socket, conditionId: string): Promise<boolean> {
    return await this.emitWithAck(socket, ServerMessageKind.UNTRACK_CLIENT_CONDITION, {
      conditionId,
    });
  }

  /**
   * Un-track a socket event without waiting for acknowledgment
   * @param socket - The socket
   * @param conditionId - The condition id to un-track
   * @returns boolean - True if the event was sent successfully
   */
  untrackClientEvent(socket: Socket, conditionId: string): boolean {
    return this.emit(socket, ServerMessageKind.UNTRACK_CLIENT_CONDITION, {
      conditionId,
    });
  }

  // ============================================================================
  // Public API Methods - Content Session Management
  // ============================================================================

  /**
   * Set the flow session
   * @param socket - The socket
   * @param session - The session to set
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async setFlowSessionWithAck(socket: Socket, session: CustomContentSession): Promise<boolean> {
    return await this.emitWithAck(socket, ServerMessageKind.SET_FLOW_SESSION, session);
  }

  /**
   * Unset the flow session
   * @param socket - The socket
   * @param sessionId - The session id to unset
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async unsetFlowSessionWithAck(socket: Socket, sessionId: string): Promise<boolean> {
    return await this.emitWithAck(socket, ServerMessageKind.UNSET_FLOW_SESSION, {
      sessionId,
    });
  }

  /**
   * Set the checklist session
   * @param socket - The socket
   * @param session - The session to set
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async setChecklistSessionWithAck(
    socket: Socket,
    session: CustomContentSession,
  ): Promise<boolean> {
    return await this.emitWithAck(socket, ServerMessageKind.SET_CHECKLIST_SESSION, session);
  }

  /**
   * Unset the checklist session
   * @param socket - The socket
   * @param sessionId - The session id to unset
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async unsetChecklistSessionWithAck(socket: Socket, sessionId: string): Promise<boolean> {
    return await this.emitWithAck(socket, ServerMessageKind.UNSET_CHECKLIST_SESSION, {
      sessionId,
    });
  }

  /**
   * Add a launcher session
   * @param socket - The socket
   * @param session - The session to add
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async addLauncherWithAck(socket: Socket, session: CustomContentSession): Promise<boolean> {
    return await this.emitWithAck(socket, ServerMessageKind.ADD_LAUNCHER, session);
  }

  /**
   * Remove a launcher
   * @param socket - The socket
   * @param contentId - The content id to remove
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async removeLauncherWithAck(socket: Socket, contentId: string): Promise<boolean> {
    return await this.emitWithAck(socket, ServerMessageKind.REMOVE_LAUNCHER, {
      contentId,
    });
  }

  // ============================================================================
  // Public API Methods - Flow Control
  // ============================================================================

  /**
   * Force go to step
   * @param socket - The socket
   * @param sessionId - The session id to force go to step
   * @param stepId - The step id to force go to step
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async forceGoToStepWithAck(socket: Socket, sessionId: string, stepId: string): Promise<boolean> {
    return await this.emitWithAck(socket, ServerMessageKind.FORCE_GO_TO_STEP, {
      sessionId,
      stepId,
    });
  }

  // ============================================================================
  // Public API Methods - Checklist Control
  // ============================================================================

  /**
   * Checklist task completed
   * @param socket - The socket
   * @param sessionId - The session id to complete the task for
   * @param taskId - The task id to complete
   * @returns boolean - True if the event was sent successfully
   */
  checklistTaskCompleted(socket: Socket, sessionId: string, taskId: string): boolean {
    return this.emit(socket, ServerMessageKind.CHECKLIST_TASK_COMPLETED, { sessionId, taskId });
  }

  // ============================================================================
  // Public API Methods - Wait Timer Conditions
  // ============================================================================

  /**
   * Start condition wait timer
   * @param socket - The socket
   * @param conditionWaitTimer - The wait timer condition to start
   * @returns Promise<boolean> - True if the event was acknowledged by client
   */
  async startConditionWaitTimerWithAck(
    socket: Socket,
    conditionWaitTimer: ConditionWaitTimer,
  ): Promise<boolean> {
    return await this.emitWithAck(
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
  async cancelConditionWaitTimerWithAck(
    socket: Socket,
    conditionWaitTimer: ConditionWaitTimer,
  ): Promise<boolean> {
    return await this.emitWithAck(
      socket,
      ServerMessageKind.CANCEL_CONDITION_WAIT_TIMER,
      conditionWaitTimer,
    );
  }

  /**
   * Cancel condition wait timer without waiting for acknowledgment
   * @param socket - The socket
   * @param conditionWaitTimer - The wait timer condition to cancel
   * @returns boolean - True if the event was sent successfully
   */
  cancelConditionWaitTimer(socket: Socket, conditionWaitTimer: ConditionWaitTimer): boolean {
    return this.emit(socket, ServerMessageKind.CANCEL_CONDITION_WAIT_TIMER, conditionWaitTimer);
  }

  // ============================================================================
  // Private Helper Methods - Generic Event Emission
  // ============================================================================

  /**
   * Emit server message with acknowledgment
   * @param socket - The socket
   * @param kind - The message kind
   * @param payload - The message payload
   * @param timeout - Timeout in milliseconds
   * @returns Promise<boolean> - True if the client successfully processed the message
   */
  private async emitWithAck(
    socket: Socket,
    kind: ServerMessageKind,
    payload?: any,
    timeout = this.DEFAULT_TIMEOUT,
  ): Promise<boolean> {
    const startTime = Date.now();
    try {
      const message = {
        kind,
        payload,
        messageId: uuidV4(), // Generate a unique message ID for idempotency
      };
      const success = await socket.timeout(timeout).emitWithAck(this.SERVER_MESSAGE_EVENT, message);
      const duration = Date.now() - startTime;
      if (!success) {
        this.logger.warn(
          `[WS] emitWithAck socketId=${socket.id} kind=${kind} - Client failed to process in ${duration}ms`,
        );
      } else {
        this.logger.log(
          `[WS] emitWithAck socketId=${socket.id} kind=${kind} - Completed in ${duration}ms`,
        );
      }
      return !!success;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[WS] emitWithAck socketId=${socket.id} kind=${kind} - Failed in ${duration}ms:`,
        error,
      );
      return false;
    }
  }

  /**
   * Emit server message without waiting for acknowledgment
   * @param socket - The socket
   * @param kind - The message kind
   * @param payload - The message payload
   * @returns boolean - True if the message was sent successfully
   */
  private emit(socket: Socket, kind: ServerMessageKind, payload?: any): boolean {
    try {
      const success = socket.emit(this.SERVER_MESSAGE_EVENT, {
        kind,
        payload,
        messageId: uuidV4(), // Generate a unique message ID for idempotency
      });
      return success;
    } catch (error) {
      this.logger.error(`Failed to emit ${kind} for socket ${socket.id}:`, error);
      return false;
    }
  }
}
