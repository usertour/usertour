import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ContentDataType } from '@usertour/types';
import { SDKContentSession, TrackCondition, WaitTimerCondition } from '@/common/types/sdk';
import { SocketDataService, SocketClientData } from './socket-data.service';

/**
 * Socket management service
 * Handles all socket-related business logic, data operations, and WebSocket events
 */
@Injectable()
export class SocketManagementService {
  private readonly logger = new Logger(SocketManagementService.name);

  constructor(private readonly socketDataService: SocketDataService) {}

  // ============================================================================
  // Client Data Management
  // ============================================================================

  /**
   * Get client data from Redis
   * @param socketId - The socket ID
   * @returns Promise<ClientData | null> - The client data or null if not found
   */
  async getClientData(socketId: string): Promise<SocketClientData | null> {
    return await this.socketDataService.getClientData(socketId);
  }

  /**
   * Set complete client data to Redis (for initialization)
   * @param socketId - The socket ID
   * @param clientData - The complete client data to set (without lastUpdated and socketId)
   * @returns Promise<boolean> - True if the data was set successfully
   */
  async setClientData(
    socketId: string,
    clientData: Omit<SocketClientData, 'lastUpdated' | 'socketId'>,
  ): Promise<boolean> {
    const data: SocketClientData = {
      ...clientData,
      lastUpdated: Date.now(),
      socketId,
    };
    return await this.socketDataService.setClientData(socketId, data);
  }

  /**
   * Update partial client data in Redis
   * @param socketId - The socket ID
   * @param updates - The partial data to update
   * @param ttlSeconds - Optional TTL in seconds
   * @returns Promise<boolean> - True if the data was updated successfully
   */
  async updateClientData(
    socketId: string,
    updates: Partial<SocketClientData>,
    ttlSeconds?: number,
  ): Promise<boolean> {
    return await this.socketDataService.updateClientData(socketId, updates, ttlSeconds);
  }

  /**
   * Remove client data from Redis
   * @param socketId - The socket ID
   * @returns Promise<boolean> - True if the data was removed successfully
   */
  async removeClientData(socketId: string): Promise<boolean> {
    return await this.socketDataService.removeClientData(socketId);
  }

  // ============================================================================
  // Room Management
  // ============================================================================

  /**
   * Build the external user room ID
   * @param environmentId - The environment id
   * @param externalUserId - The external user id
   * @returns The external user room ID
   */
  buildExternalUserRoomId(environmentId: string, externalUserId: string): string {
    return `user:${environmentId}:${externalUserId}`;
  }

  // ============================================================================
  // WebSocket Event Helpers
  // ============================================================================

  /**
   * Track a client event
   * @param socket - The socket
   * @param condition - The condition to emit
   */
  private trackClientEvent(socket: Socket, condition: TrackCondition) {
    return socket.emit('track-client-condition', condition);
  }

  /**
   * Un-track a client event
   * @param socket - The socket
   * @param conditionId - The condition id to un-track
   */
  private untrackClientEvent(socket: Socket, conditionId: string) {
    return socket.emit('untrack-client-condition', {
      conditionId,
    });
  }

  /**
   * Set the flow session
   * @param socket - The socket
   * @param session - The session to set
   */
  private setFlowSession(socket: Socket, session: SDKContentSession) {
    return socket.emit('set-flow-session', session);
  }

  /**
   * Set the checklist session
   * @param socket - The socket
   * @param session - The session to set
   */
  private setChecklistSession(socket: Socket, session: SDKContentSession) {
    return socket.emit('set-checklist-session', session);
  }

  /**
   * Unset the flow session
   * @param socket - The socket
   * @param sessionId - The session id to unset
   */
  unsetFlowSession(socket: Socket, sessionId: string) {
    return socket.emit('unset-flow-session', { sessionId });
  }

  /**
   * Unset the checklist session
   * @param socket - The socket
   * @param sessionId - The session id to unset
   */
  unsetChecklistSession(socket: Socket, sessionId: string) {
    return socket.emit('unset-checklist-session', { sessionId });
  }

  /**
   * Force go to step
   * @param socket - The socket
   * @param sessionId - The session id to force go to step
   * @param stepId - The step id to force go to step
   */
  forceGoToStep(socket: Socket, sessionId: string, stepId: string) {
    return socket.emit('force-go-to-step', {
      sessionId,
      stepId,
    });
  }

  /**
   * Start condition wait timer
   * @param socket - The socket
   * @param waitTimerCondition - The wait timer condition to start
   */
  startConditionWaitTimer(socket: Socket, waitTimerCondition: WaitTimerCondition) {
    return socket.emit('start-condition-wait-timer', waitTimerCondition);
  }

  /**
   * Cancel condition wait timer
   * @param socket - The socket
   * @param waitTimerCondition - The wait timer condition to cancel
   */
  cancelConditionWaitTimer(socket: Socket, waitTimerCondition: WaitTimerCondition) {
    return socket.emit('cancel-condition-wait-timer', waitTimerCondition);
  }

  // ============================================================================
  // Content Session Management
  // ============================================================================

  /**
   * Get content session from client
   * @param socketId - The socket ID
   * @param contentType - The content type
   * @returns Promise<SDKContentSession | null> - The content session or null
   */
  async getContentSessionByType(
    socketId: string,
    contentType: ContentDataType,
  ): Promise<SDKContentSession | null> {
    const data = await this.getClientData(socketId);
    if (!data) {
      return null;
    }

    switch (contentType) {
      case ContentDataType.FLOW:
        return data.flowSession ?? null;
      case ContentDataType.CHECKLIST:
        return data.checklistSession ?? null;
      default:
        return null;
    }
  }

  /**
   * Update content session by type
   * @param socketId - The socket ID
   * @param session - The session to update
   * @returns Promise<boolean> - True if the session was updated successfully
   */
  async updateContentSessionByType(socketId: string, session: SDKContentSession): Promise<boolean> {
    const contentType = session.content.type as ContentDataType;
    switch (contentType) {
      case ContentDataType.FLOW:
        return await this.updateClientData(socketId, { flowSession: session });
      case ContentDataType.CHECKLIST:
        return await this.updateClientData(socketId, { checklistSession: session });
      default:
        return false;
    }
  }

  /**
   * Set content session for client
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
          return this.setFlowSession(socket, session);
        case ContentDataType.CHECKLIST:
          return this.setChecklistSession(socket, session);
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
   * @param contentType - The content type to unset
   * @param sessionId - The session id to unset
   * @param emitWebSocket - Whether to emit WebSocket events (default: true)
   * @returns Promise<void>
   */
  async unsetCurrentContentSession(
    socket: Socket,
    contentType: ContentDataType,
    sessionId: string,
    emitWebSocket = true,
  ): Promise<void> {
    try {
      const data = await this.getClientData(socket.id);
      if (!data?.environment || !data?.externalUserId || !sessionId) {
        return;
      }

      // Define session configuration based on content type
      const sessionConfig = {
        [ContentDataType.FLOW]: {
          currentSession: data.flowSession,
          unsetEvent: () => this.unsetFlowSession(socket, sessionId),
          clientDataKey: 'flowSession' as const,
        },
        [ContentDataType.CHECKLIST]: {
          currentSession: data.checklistSession,
          unsetEvent: () => this.unsetChecklistSession(socket, sessionId),
          clientDataKey: 'checklistSession' as const,
        },
      };

      const config = sessionConfig[contentType];
      if (!config) {
        return;
      }

      // Emit WebSocket event if requested
      if (emitWebSocket && sessionId) {
        config.unsetEvent();
      }

      // Check if current session matches the sessionId to unset
      const currentSessionId = config.currentSession?.id;
      if (currentSessionId === sessionId) {
        // Clear session data from client
        await this.updateClientData(socket.id, { [config.clientDataKey]: undefined });
      }
    } catch (error) {
      this.logger.error(`Failed to unset content session for socket ${socket.id}:`, error);
    }
  }

  // ============================================================================
  // Condition Tracking Management
  // ============================================================================

  /**
   * Track client conditions
   * @param socket - The socket
   * @param trackConditions - The conditions to track
   * @returns Promise<void>
   */
  async trackClientConditions(socket: Socket, trackConditions: TrackCondition[]): Promise<void> {
    try {
      // Early return if no conditions to track
      if (!trackConditions?.length) return;

      const data = await this.getClientData(socket.id);
      if (!data?.environment || !data?.externalUserId) {
        this.logger.warn(`Missing environment or user ID for socket ${socket.id}`);
        return;
      }

      const existingConditions = data.trackConditions ?? [];

      // Filter out conditions that already exist
      const newConditions = trackConditions.filter(
        (condition) =>
          !existingConditions?.some((existing) => existing.condition.id === condition.condition.id),
      );

      // Early return if no new conditions to track
      if (!newConditions.length) return;

      // Emit track events and collect successfully tracked conditions
      const trackedConditions = newConditions.filter((condition) =>
        this.trackClientEvent(socket, condition),
      );

      // Update client data by merging with existing conditions
      await this.updateClientData(socket.id, {
        trackConditions: [...existingConditions, ...trackedConditions],
      });
    } catch (error) {
      this.logger.error(`Failed to track client conditions for socket ${socket.id}:`, error);
    }
  }

  /**
   * Toggle specific client condition
   * @param socket - The socket
   * @param conditionId - The condition ID
   * @param isActive - Whether the condition is active
   * @returns Promise<boolean> - True if the condition was toggled successfully
   */
  async toggleClientCondition(
    socket: Socket,
    conditionId: string,
    isActive: boolean,
  ): Promise<boolean> {
    try {
      const data = await this.getClientData(socket.id);
      const trackConditions = data?.trackConditions ?? [];

      // Early return if no conditions exist
      if (!trackConditions?.length) return false;

      // Check if condition exists first
      if (!trackConditions.some((c) => c.condition.id === conditionId)) {
        return false;
      }

      // Update the condition
      const updatedConditions = trackConditions.map((trackCondition) =>
        trackCondition.condition.id === conditionId
          ? {
              ...trackCondition,
              condition: {
                ...trackCondition.condition,
                actived: isActive,
              },
            }
          : trackCondition,
      );

      // Update client data
      await this.updateClientData(socket.id, { trackConditions: updatedConditions });
      return true;
    } catch (error) {
      this.logger.error(`Failed to toggle client condition for socket ${socket.id}:`, error);
      return false;
    }
  }

  /**
   * Untrack current conditions with optional exclusions
   * @param socket - The socket
   * @param excludeConditionIds - Array of condition IDs to exclude from untracking
   * @returns Promise<void>
   */
  async untrackCurrentConditions(socket: Socket, excludeConditionIds?: string[]): Promise<void> {
    try {
      const data = await this.getClientData(socket.id);
      const trackConditions = data?.trackConditions ?? [];

      // Early return if no existing conditions to remove
      if (!trackConditions?.length) return;

      // Early return if no environment or user ID
      if (!data?.environment || !data?.externalUserId) {
        return;
      }

      // Determine which conditions to untrack
      const conditionsToUntrack = excludeConditionIds?.length
        ? trackConditions.filter((c) => !excludeConditionIds.includes(c.condition.id))
        : trackConditions;

      // Early return if no conditions to untrack
      if (!conditionsToUntrack.length) return;

      // Emit untrack events and collect successfully untracked conditions
      const untrackedConditions = conditionsToUntrack.filter((condition) =>
        this.untrackClientEvent(socket, condition.condition.id),
      );

      // Update client data
      await this.updateClientData(socket.id, {
        trackConditions: trackConditions.filter(
          (condition) =>
            !untrackedConditions.some(
              (untracked) => untracked.condition.id === condition.condition.id,
            ),
        ),
      });
    } catch (error) {
      this.logger.error(`Failed to untrack client conditions for socket ${socket.id}:`, error);
    }
  }

  // ============================================================================
  // Wait Timer Conditions Management
  // ============================================================================

  /**
   * Start wait timer conditions
   * @param socket - The socket
   * @param startConditions - The conditions to start
   * @returns Promise<void>
   */
  async startWaitTimerConditions(
    socket: Socket,
    startConditions: WaitTimerCondition[],
  ): Promise<void> {
    try {
      // Early return if no conditions to start
      if (!startConditions?.length) return;

      const data = await this.getClientData(socket.id);
      if (!data?.environment || !data?.externalUserId) {
        this.logger.warn(`Missing environment or user ID for socket ${socket.id}`);
        return;
      }

      const existingConditions = data.waitTimerConditions ?? [];

      // Filter out conditions that already exist
      const newConditions = startConditions.filter(
        (condition) =>
          !existingConditions?.some((existing) => existing.versionId === condition.versionId),
      );

      // Early return if no new conditions to start
      if (!newConditions.length) return;

      // Emit start events and collect successfully started conditions
      const startedConditions = newConditions.filter((condition) =>
        this.startConditionWaitTimer(socket, condition),
      );

      // Update client data by merging with existing conditions
      await this.updateClientData(socket.id, {
        waitTimerConditions: [...existingConditions, ...startedConditions],
      });
    } catch (error) {
      this.logger.error(`Failed to start wait timer conditions for socket ${socket.id}:`, error);
    }
  }

  /**
   * Fire specific client condition wait timer
   * @param socket - The socket
   * @param versionId - The version ID
   * @returns Promise<boolean> - True if the condition was fired successfully
   */
  async fireClientConditionWaitTimer(socket: Socket, versionId: string): Promise<boolean> {
    try {
      const data = await this.getClientData(socket.id);
      const waitTimerConditions = data?.waitTimerConditions ?? [];

      // Early return if no conditions exist
      if (!waitTimerConditions?.length) return false;

      const targetCondition = waitTimerConditions.find((c) => c.versionId === versionId);
      // Check if condition exists first
      if (!targetCondition) {
        return false;
      }

      // Update the condition
      const updatedConditions = waitTimerConditions.map((trackCondition) =>
        trackCondition.versionId === versionId
          ? {
              ...trackCondition,
              activated: true,
            }
          : trackCondition,
      );

      // Update client data
      await this.updateClientData(socket.id, { waitTimerConditions: updatedConditions });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to fire client condition wait timer for socket ${socket.id}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Cancel current wait timer conditions
   * @param socket - The socket
   * @returns Promise<void>
   */
  async cancelCurrentWaitTimerConditions(socket: Socket): Promise<void> {
    try {
      const data = await this.getClientData(socket.id);
      const waitTimerConditions = data?.waitTimerConditions ?? [];

      // Early return if no existing conditions to remove
      if (!waitTimerConditions?.length) return;

      if (!data?.environment || !data?.externalUserId) {
        this.logger.warn(`Missing environment or user ID for socket ${socket.id}`);
        return;
      }

      // Filter out already activated conditions and emit cancellation events
      const conditionsToCancel = waitTimerConditions.filter((condition) => !condition.activated);

      // Emit cancellation events for non-activated conditions
      for (const condition of conditionsToCancel) {
        this.cancelConditionWaitTimer(socket, condition);
      }

      // Clear all wait timer conditions from client data
      await this.updateClientData(socket.id, { waitTimerConditions: [] });
    } catch (error) {
      this.logger.error(`Failed to cancel wait timer conditions for socket ${socket.id}:`, error);
    }
  }
}
