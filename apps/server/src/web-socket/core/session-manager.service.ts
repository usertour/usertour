import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ContentDataType } from '@usertour/types';
import { SDKContentSession, TrackCondition, SocketClientData } from '@/common/types';
import { SocketDataService } from './socket-data.service';
import { SocketEmitterService } from './socket-emitter.service';
import { ConditionTrackingService } from './condition-tracking.service';
import { ConditionTimerService } from './condition-timer.service';
import { buildExternalUserRoomId, extractContentTypeBySessionId } from '@/utils/websocket-utils';

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
   * Emit set socket session event
   * @param socket - The socket
   * @param session - The session to set
   * @returns boolean - True if the session was set successfully
   */
  private setSocketSession(socket: Socket, session: SDKContentSession): boolean {
    const socketId = socket.id;
    try {
      const contentType = session.content.type as ContentDataType;

      switch (contentType) {
        case ContentDataType.FLOW:
          return this.socketEmitterService.setFlowSession(socket, session);
        case ContentDataType.CHECKLIST:
          return this.socketEmitterService.setChecklistSession(socket, session);
        default:
          this.logger.warn(`Unsupported content type: ${contentType}`);
          return false;
      }
    } catch (error) {
      this.logger.error(`Failed to set content session for socket ${socketId}:`, error);
      return false;
    }
  }

  /**
   * Clear flow session for socket
   * @param socket - The socket
   * @param socketClientData - The socket client data
   * @param sessionId - The session id to clear
   * @param emitWebSocket - Whether to emit WebSocket events (default: true)
   * @returns Promise<boolean> - True if the session was cleared successfully
   */
  async clearFlowSession(
    socket: Socket,
    socketClientData: SocketClientData,
    sessionId: string,
    emitWebSocket = true,
  ): Promise<boolean> {
    try {
      // Validate input parameters
      if (!sessionId?.trim() || !socketClientData) {
        return false;
      }

      const currentSession = socketClientData.flowSession;

      // Emit WebSocket event if requested
      if (emitWebSocket) {
        this.socketEmitterService.unsetFlowSession(socket, sessionId);
      }

      // Clear session data if it matches the sessionId
      if (currentSession?.id === sessionId) {
        const updateSuccess = await this.socketDataService.updateClientData(socket.id, {
          flowSession: undefined,
        });

        if (!updateSuccess) {
          this.logger.error(`Failed to clear flow session data for session ${sessionId}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to clear flow session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Clear checklist session for socket
   * @param socket - The socket
   * @param socketClientData - The socket client data
   * @param sessionId - The session id to clear
   * @param emitWebSocket - Whether to emit WebSocket events (default: true)
   * @returns Promise<boolean> - True if the session was cleared successfully
   */
  async clearChecklistSession(
    socket: Socket,
    socketClientData: SocketClientData,
    sessionId: string,
    emitWebSocket = true,
  ): Promise<boolean> {
    try {
      // Validate input parameters
      if (!sessionId?.trim() || !socketClientData) {
        return false;
      }

      const currentSession = socketClientData.checklistSession;

      // Emit WebSocket event if requested
      if (emitWebSocket) {
        this.socketEmitterService.unsetChecklistSession(socket, sessionId);
      }

      // Clear session data if it matches the sessionId
      if (currentSession?.id === sessionId) {
        const updateSuccess = await this.socketDataService.updateClientData(socket.id, {
          checklistSession: undefined,
        });

        if (!updateSuccess) {
          this.logger.error(`Failed to clear checklist session data for session ${sessionId}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to clear checklist session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Cleanup socket session
   * @param socket - The socket
   * @param sessionId - The session id to cleanup
   * @returns Promise<boolean> - True if the session was cleaned up successfully
   */
  async cleanupSocketSession(
    socket: Socket,
    sessionId: string,
    emitUnsetSessionEvent = true,
  ): Promise<boolean> {
    const socketClientData = await this.socketDataService.getClientData(socket.id);
    if (!socketClientData) {
      return false;
    }
    const { clientConditions, conditionWaitTimers } = socketClientData;
    const contentType = extractContentTypeBySessionId(socketClientData, sessionId);

    // Clear current flow session (without WebSocket emission)
    if (contentType === ContentDataType.FLOW) {
      await this.clearFlowSession(socket, socketClientData, sessionId, emitUnsetSessionEvent);
    } else if (contentType === ContentDataType.CHECKLIST) {
      await this.clearChecklistSession(socket, socketClientData, sessionId, emitUnsetSessionEvent);
    }
    // Untrack current conditions
    await this.conditionTrackingService.untrackClientConditions(socket, clientConditions);
    // Cancel current wait timer conditions
    await this.conditionTimerService.cancelConditionWaitTimers(socket, conditionWaitTimers);
  }

  /**
   * Activate socket session
   * @param socket - The socket
   * @param session - The session to activate
   * @param trackHideConditions - The hide conditions to track
   * @param forceGoToStep - Whether to force go to step
   * @returns Promise<boolean> - True if the session was activated successfully
   */
  async activateSocketSession(
    socket: Socket,
    session: SDKContentSession,
    trackHideConditions: TrackCondition[] | undefined,
    forceGoToStep: boolean,
  ): Promise<boolean> {
    const socketClientData = await this.socketDataService.getClientData(socket.id);
    if (!socketClientData) {
      return false;
    }
    const { clientConditions, conditionWaitTimers } = socketClientData;

    const isUpdated = await this.updateClientDataBySession(socket.id, session);
    if (!isUpdated) {
      return false;
    }
    const isSetSession = this.setSocketSession(socket, session);
    if (!isSetSession) {
      return false;
    }

    if (forceGoToStep) {
      this.socketEmitterService.forceGoToStep(socket, session.id, session.currentStep?.cvid!);
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

  /**
   * Cleanup socket sessions for other sockets in the same room
   * @param server - The WebSocket server
   * @param currentSocket - The current socket to exclude
   * @param sessionId - The session ID to cleanup
   * @param environmentId - The environment ID
   * @param externalUserId - The external user ID
   * @returns Promise<boolean> - True if cleanup was successful
   */
  async cleanupOtherSocketsInRoom(
    server: Server,
    currentSocket: Socket,
    sessionId: string,
    environmentId: string,
    externalUserId: string,
  ): Promise<boolean> {
    try {
      const room = buildExternalUserRoomId(environmentId, externalUserId);
      const sockets = await server.in(room).fetchSockets();
      if (sockets.length === 0) {
        return false;
      }

      for (const socket of sockets) {
        if (socket.id === currentSocket.id) {
          continue;
        }
        await this.cleanupSocketSession(socket as unknown as Socket, sessionId);
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to cleanup other sockets in room: ${error.message}`);
      return false;
    }
  }

  /**
   * Activate socket sessions for all sockets in the same room
   * @param server - The WebSocket server
   * @param session - The session to activate
   * @param trackHideConditions - The hide conditions to track
   * @param forceGoToStep - Whether to force go to step
   * @param environmentId - The environment ID
   * @param externalUserId - The external user ID
   * @returns Promise<boolean> - True if activation was successful
   */
  async activateAllSocketsInRoom(
    server: Server,
    session: SDKContentSession,
    trackHideConditions: TrackCondition[] | undefined,
    forceGoToStep: boolean,
    environmentId: string,
    externalUserId: string,
  ): Promise<boolean> {
    try {
      const room = buildExternalUserRoomId(environmentId, externalUserId);
      const sockets = await server.in(room).fetchSockets();

      if (sockets.length === 0) {
        return false;
      }

      for (const socket of sockets) {
        await this.activateSocketSession(
          socket as unknown as Socket,
          session,
          trackHideConditions,
          forceGoToStep,
        );
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to activate all sockets in room: ${error.message}`);
      return false;
    }
  }
}
