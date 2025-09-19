import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ContentDataType } from '@usertour/types';
import { SDKContentSession, TrackCondition, SocketClientData } from '@/common/types';
import { SocketDataService } from './socket-data.service';
import { SocketEmitterService } from './socket-emitter.service';
import { ConditionTrackingService } from './condition-tracking.service';
import { ConditionTimerService } from './condition-timer.service';
import { extractContentTypeBySessionId } from '@/utils/websocket-utils';

/**
 * Content session manager service
 * Handles content session management for Flow and Checklist content types
 * Focused on session lifecycle management, data persistence, and WebSocket communication
 * Delegates session creation and manipulation to SessionDataService
 */
@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);

  constructor(
    private readonly socketDataService: SocketDataService,
    private readonly socketEmitterService: SocketEmitterService,
    private readonly conditionTrackingService: ConditionTrackingService,
    private readonly conditionTimerService: ConditionTimerService,
  ) {}

  /**
   * Update client data by session
   * @param socketId - The socket ID
   * @param session - The session to update
   * @returns Promise<boolean> - True if the session was updated successfully
   */
  private async updateClientDataBySession(
    socketId: string,
    session: SDKContentSession,
  ): Promise<boolean> {
    const contentType = session.content.type as ContentDataType;
    switch (contentType) {
      case ContentDataType.FLOW:
        return await this.socketDataService.updateClientData(socketId, { flowSession: session });
      case ContentDataType.CHECKLIST:
        return await this.socketDataService.updateClientData(socketId, {
          checklistSession: session,
        });
      default:
        return false;
    }
  }

  /**
   * Emit set socket session event with acknowledgment
   * @param socket - The socket instance
   * @param session - The session data to set
   * @returns Promise<boolean> - True if the session was set and acknowledged by client
   */
  private async setSocketSession(socket: Socket, session: SDKContentSession): Promise<boolean> {
    const contentType = session.content.type as ContentDataType;

    switch (contentType) {
      case ContentDataType.FLOW:
        return await this.socketEmitterService.setFlowSession(socket, session);
      case ContentDataType.CHECKLIST:
        return await this.socketEmitterService.setChecklistSession(socket, session);
      default:
        this.logger.warn(`Unsupported content type: ${contentType}`);
        return false;
    }
  }

  /**
   * Clear flow session for socket
   * @param socket - The socket
   * @param sessionId - The session id to clear
   * @param emitWebSocket - Whether to emit WebSocket events (default: true)
   * @returns Promise<boolean> - True if the session was cleared successfully
   */
  private async clearFlowSession(
    socket: Socket,
    sessionId: string,
    emitWebSocket = true,
  ): Promise<boolean> {
    // Emit WebSocket event if requested
    if (emitWebSocket) {
      await this.socketEmitterService.unsetFlowSession(socket, sessionId);
    }

    // Clear session data if it matches the sessionId
    return await this.socketDataService.updateClientData(socket.id, {
      flowSession: undefined,
    });
  }

  /**
   * Clear checklist session for socket
   * @param socket - The socket
   * @param sessionId - The session id to clear
   * @param emitWebSocket - Whether to emit WebSocket events (default: true)
   * @returns Promise<boolean> - True if the session was cleared successfully
   */
  private async clearChecklistSession(
    socket: Socket,
    sessionId: string,
    emitWebSocket = true,
  ): Promise<boolean> {
    // Emit WebSocket event if requested
    if (emitWebSocket) {
      await this.socketEmitterService.unsetChecklistSession(socket, sessionId);
    }

    // Clear session data if it matches the sessionId
    return await this.socketDataService.updateClientData(socket.id, {
      checklistSession: undefined,
    });
  }

  // Clear session data if it matches the sessionId
  /**
   * Cleanup socket session and associated conditions
   * @param socket - The socket instance
   * @param socketClientData - The socket client data
   * @param sessionId - The session id to cleanup
   * @param emitUnsetSessionEvent - Whether to emit unset session events (default: true)
   * @returns Promise<boolean> - True if the session was cleaned up successfully
   */
  async cleanupSocketSession(
    socket: Socket,
    socketClientData: SocketClientData,
    sessionId: string,
    emitUnsetSessionEvent = true,
  ): Promise<boolean> {
    const { clientConditions, conditionWaitTimers } = socketClientData;
    const contentType = extractContentTypeBySessionId(socketClientData, sessionId);
    // If the session is not found, return false
    if (!contentType) {
      return false;
    }
    // Clear current flow session (without WebSocket emission)
    if (contentType === ContentDataType.FLOW) {
      const flowCleared = await this.clearFlowSession(socket, sessionId, emitUnsetSessionEvent);
      if (!flowCleared) {
        return false;
      }
    } else if (contentType === ContentDataType.CHECKLIST) {
      const checklistCleared = await this.clearChecklistSession(
        socket,
        sessionId,
        emitUnsetSessionEvent,
      );
      if (!checklistCleared) {
        return false;
      }
    }
    // Untrack current conditions
    await this.conditionTrackingService.untrackClientConditions(socket, clientConditions);
    // Cancel current wait timer conditions
    await this.conditionTimerService.cancelConditionWaitTimers(socket, conditionWaitTimers);

    return true;
  }

  /**
   * Activate socket session
   * @param socket - The socket
   * @param socketClientData - The socket client data
   * @param session - The session to activate
   * @param trackHideConditions - The hide conditions to track
   * @param forceGoToStep - Whether to force go to step
   * @returns Promise<boolean> - True if the session was activated successfully
   */
  async activateSocketSession(
    socket: Socket,
    socketClientData: SocketClientData,
    session: SDKContentSession,
    trackHideConditions: TrackCondition[] | undefined,
    forceGoToStep: boolean,
  ): Promise<boolean> {
    const { clientConditions, conditionWaitTimers } = socketClientData;
    // Update client data by session
    const isUpdated = await this.updateClientDataBySession(socket.id, session);
    if (!isUpdated) {
      return false;
    }
    const isSetSession = await this.setSocketSession(socket, session);
    if (!isSetSession) {
      return false;
    }

    if (forceGoToStep) {
      await this.socketEmitterService.forceGoToStep(socket, session.id, session.currentStep?.cvid!);
    }

    // Untrack current conditions
    await this.conditionTrackingService.untrackClientConditions(socket, clientConditions);

    // Cancel wait timer conditions that are not the current session
    const cancelConditionWaitTimers = conditionWaitTimers.filter(
      (conditionWaitTimer) => conditionWaitTimer.versionId !== session.version.id,
    );
    await this.conditionTimerService.cancelConditionWaitTimers(socket, cancelConditionWaitTimers);

    // Track the hide conditions
    if (trackHideConditions && trackHideConditions.length > 0) {
      await this.conditionTrackingService.trackClientConditions(socket, trackHideConditions);
    }

    return true;
  }
}
