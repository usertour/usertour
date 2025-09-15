import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ContentDataType } from '@usertour/types';
import { SDKContentSession } from '@/common/types/sdk';
import { SocketDataService, SocketClientData } from './socket-data.service';
import { SocketEmitterService } from './socket-emitter.service';
import { SessionDataService } from './session-data.service';

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
    private readonly sessionDataService: SessionDataService,
  ) {}

  /**
   * Get content session from socket data by type
   * @param socketClientData - The socket client data
   * @param contentType - The content type
   * @returns Promise<SDKContentSession | null> - The content session or null
   */
  async getContentSessionByType(
    socketClientData: SocketClientData,
    contentType: ContentDataType,
  ): Promise<SDKContentSession | null> {
    const { flowSession, checklistSession } = socketClientData;
    switch (contentType) {
      case ContentDataType.FLOW:
        return flowSession ?? null;
      case ContentDataType.CHECKLIST:
        return checklistSession ?? null;
      default:
        return null;
    }
  }

  /**
   * Update content session by type in socket data
   * @param socketId - The socket ID
   * @param session - The session to update
   * @returns Promise<boolean> - True if the session was updated successfully
   */
  async updateContentSessionByType(socketId: string, session: SDKContentSession): Promise<boolean> {
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
   * Set content session for socket and emit WebSocket event
   * @param socket - The socket
   * @param session - The session to set
   * @returns boolean - True if the session was set successfully
   */
  setContentSession(socket: Socket, session: SDKContentSession): boolean {
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
   * Unset current content session for socket
   * @param socket - The socket
   * @param socketClientData - The socket client data
   * @param contentType - The content type to unset
   * @param sessionId - The session id to unset
   * @param emitWebSocket - Whether to emit WebSocket events (default: true)
   * @returns Promise<void>
   */
  async unsetCurrentContentSession(
    socket: Socket,
    socketClientData: SocketClientData,
    contentType: ContentDataType,
    sessionId: string,
    emitWebSocket = true,
  ): Promise<void> {
    try {
      if (!sessionId) return;

      if (!socketClientData) return;

      const sessionConfig = this.getSessionConfig(contentType, socketClientData, socket, sessionId);
      if (!sessionConfig) return;

      // Emit WebSocket event if requested
      if (emitWebSocket) {
        sessionConfig.unsetEvent();
      }

      // Clear session data if it matches the sessionId to unset
      if (sessionConfig.currentSession?.id === sessionId) {
        await this.socketDataService.updateClientData(socket.id, {
          [sessionConfig.clientDataKey]: undefined,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to unset content session for socket ${socket.id}:`, error);
    }
  }

  /**
   * Refresh content session with updated data
   * @param socket - The socket
   * @param socketClientData - The socket client data
   * @param contentType - The content type
   * @returns Promise<boolean> - True if the session was refreshed successfully
   */
  async refreshContentSession(
    socket: Socket,
    socketClientData: SocketClientData,
    contentType: ContentDataType,
  ): Promise<boolean> {
    try {
      const currentSession = await this.getContentSessionByType(socketClientData, contentType);
      if (!currentSession) {
        this.logger.warn(`No session found to refresh for type ${contentType}`);
        return false;
      }

      const { environment, externalUserId, externalCompanyId } = socketClientData;
      const refreshedSession = await this.sessionDataService.refreshContentSession(
        currentSession,
        environment,
        externalUserId,
        externalCompanyId,
      );

      if (!refreshedSession) {
        this.logger.error(`Failed to refresh session for type ${contentType}`);
        return false;
      }

      // Update the session in socket data
      const updateSuccess = await this.updateContentSessionByType(socket.id, refreshedSession);
      if (!updateSuccess) {
        this.logger.error(`Failed to update refreshed session for type ${contentType}`);
        return false;
      }

      // Emit the refreshed session to the client
      const emitSuccess = this.setContentSession(socket, refreshedSession);
      if (!emitSuccess) {
        this.logger.error(`Failed to emit refreshed session for type ${contentType}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to refresh content session for socket ${socket.id}:`, error);
      return false;
    }
  }

  /**
   * Get session configuration for content type
   * @private
   */
  private getSessionConfig(
    contentType: ContentDataType,
    socketClientData: SocketClientData,
    socket: Socket,
    sessionId: string,
  ) {
    const configs = {
      [ContentDataType.FLOW]: {
        currentSession: socketClientData.flowSession,
        unsetEvent: () => this.socketEmitterService.unsetFlowSession(socket, sessionId),
        clientDataKey: 'flowSession' as const,
      },
      [ContentDataType.CHECKLIST]: {
        currentSession: socketClientData.checklistSession,
        unsetEvent: () => this.socketEmitterService.unsetChecklistSession(socket, sessionId),
        clientDataKey: 'checklistSession' as const,
      },
    };

    return configs[contentType] || null;
  }
}
