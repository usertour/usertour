import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import {
  ClientCondition,
  ConditionWaitTimer,
  CustomContentSession,
  ServerMessageKind,
  TrackCondition,
} from '@usertour/types';
import { uuidV4 } from '@usertour/helpers';

// ============================================================================
// Socket Emitter Service
// ============================================================================

/**
 * Sends the server's messages to a client connection.
 *
 * Nothing here waits for the client's receipt. A receipt proved only that
 * the socket was open at that moment: the SDK acknowledges before it
 * processes, and the server decided nothing on it that mattered. socket.io
 * keeps the order of what it sends on one connection; a connection that is
 * gone has its writes dropped, is closed by the heartbeat, and gets its
 * state again from the client's own re-evaluation on reconnect (ADR 0018).
 * Waiting cost a client round trip per message, in series, inside the unit
 * of work that holds the admission slot and the socket's lock, and a slow
 * link turned a receipt that arrived late into a failure the client never
 * saw.
 */
@Injectable()
export class SocketEmitterService {
  private readonly logger = new Logger(SocketEmitterService.name);
  private readonly SERVER_MESSAGE_EVENT = 'server-message';

  // ============================================================================
  // Client conditions
  // ============================================================================

  trackClientCondition(socket: Socket, condition: TrackCondition): boolean {
    return this.emit(socket, ServerMessageKind.TRACK_CLIENT_CONDITION, condition);
  }

  trackClientConditions(socket: Socket, conditions: TrackCondition[]): void {
    for (const condition of conditions) {
      this.trackClientCondition(socket, condition);
    }
  }

  untrackClientCondition(socket: Socket, conditionId: string): boolean {
    return this.emit(socket, ServerMessageKind.UNTRACK_CLIENT_CONDITION, { conditionId });
  }

  untrackClientConditions(socket: Socket, conditions: ClientCondition[]): void {
    for (const condition of conditions) {
      this.untrackClientCondition(socket, condition.conditionId);
    }
  }

  // ============================================================================
  // Content sessions
  // ============================================================================

  setFlowSession(socket: Socket, session: CustomContentSession): boolean {
    return this.emit(socket, ServerMessageKind.SET_FLOW_SESSION, session);
  }

  unsetFlowSession(socket: Socket, sessionId: string): boolean {
    return this.emit(socket, ServerMessageKind.UNSET_FLOW_SESSION, { sessionId });
  }

  setChecklistSession(socket: Socket, session: CustomContentSession): boolean {
    return this.emit(socket, ServerMessageKind.SET_CHECKLIST_SESSION, session);
  }

  unsetChecklistSession(socket: Socket, sessionId: string): boolean {
    return this.emit(socket, ServerMessageKind.UNSET_CHECKLIST_SESSION, { sessionId });
  }

  setBannerSession(socket: Socket, session: CustomContentSession): boolean {
    return this.emit(socket, ServerMessageKind.SET_BANNER_SESSION, session);
  }

  unsetBannerSession(socket: Socket, sessionId: string): boolean {
    return this.emit(socket, ServerMessageKind.UNSET_BANNER_SESSION, { sessionId });
  }

  setResourceCenterSession(socket: Socket, session: CustomContentSession): boolean {
    return this.emit(socket, ServerMessageKind.SET_RESOURCE_CENTER_SESSION, session);
  }

  unsetResourceCenterSession(socket: Socket, sessionId: string): boolean {
    return this.emit(socket, ServerMessageKind.UNSET_RESOURCE_CENTER_SESSION, { sessionId });
  }

  addLauncher(socket: Socket, session: CustomContentSession): boolean {
    return this.emit(socket, ServerMessageKind.ADD_LAUNCHER, session);
  }

  addLaunchers(socket: Socket, sessions: CustomContentSession[]): void {
    for (const session of sessions) {
      this.addLauncher(socket, session);
    }
  }

  removeLauncher(socket: Socket, contentId: string): boolean {
    return this.emit(socket, ServerMessageKind.REMOVE_LAUNCHER, { contentId });
  }

  removeLaunchers(socket: Socket, contentIds: string[]): void {
    for (const contentId of contentIds) {
      this.removeLauncher(socket, contentId);
    }
  }

  addTracker(socket: Socket, session: CustomContentSession): boolean {
    return this.emit(socket, ServerMessageKind.ADD_TRACKER, session);
  }

  addTrackers(socket: Socket, sessions: CustomContentSession[]): void {
    for (const session of sessions) {
      this.addTracker(socket, session);
    }
  }

  removeTracker(socket: Socket, contentId: string): boolean {
    return this.emit(socket, ServerMessageKind.REMOVE_TRACKER, { contentId });
  }

  removeTrackers(socket: Socket, contentIds: string[]): void {
    for (const contentId of contentIds) {
      this.removeTracker(socket, contentId);
    }
  }

  // ============================================================================
  // Flow and checklist control
  // ============================================================================

  /** Sent after the session it belongs to, on the same connection, so the client takes it in that order. */
  forceGoToStep(socket: Socket, sessionId: string, stepId: string): boolean {
    return this.emit(socket, ServerMessageKind.FORCE_GO_TO_STEP, { sessionId, stepId });
  }

  checklistTaskCompleted(socket: Socket, sessionId: string, taskId: string): boolean {
    return this.emit(socket, ServerMessageKind.CHECKLIST_TASK_COMPLETED, { sessionId, taskId });
  }

  // ============================================================================
  // Condition wait timers
  // ============================================================================

  startConditionWaitTimer(socket: Socket, conditionWaitTimer: ConditionWaitTimer): boolean {
    return this.emit(socket, ServerMessageKind.START_CONDITION_WAIT_TIMER, conditionWaitTimer);
  }

  startConditionWaitTimers(socket: Socket, waitTimers: ConditionWaitTimer[]): void {
    for (const waitTimer of waitTimers) {
      this.startConditionWaitTimer(socket, waitTimer);
    }
  }

  cancelConditionWaitTimer(socket: Socket, conditionWaitTimer: ConditionWaitTimer): boolean {
    return this.emit(socket, ServerMessageKind.CANCEL_CONDITION_WAIT_TIMER, conditionWaitTimer);
  }

  cancelConditionWaitTimers(socket: Socket, waitTimers: ConditionWaitTimer[]): void {
    for (const waitTimer of waitTimers) {
      this.cancelConditionWaitTimer(socket, waitTimer);
    }
  }

  // ============================================================================
  // Transport
  // ============================================================================

  /**
   * Hands one server message to the connection's transport. True means it
   * was written; a connection that is not open drops it, as socket.io does.
   */
  private emit(socket: Socket, kind: ServerMessageKind, payload?: unknown): boolean {
    try {
      return socket.emit(this.SERVER_MESSAGE_EVENT, {
        kind,
        payload,
        messageId: uuidV4(), // Generate a unique message ID for idempotency
      });
    } catch (error) {
      this.logger.error(`Failed to emit ${kind} for socket ${socket.id}:`, error);
      return false;
    }
  }
}
