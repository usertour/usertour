import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
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
   * @param client - The socket client
   * @returns Promise<ClientData | null> - The client data or null if not found
   */
  async getClientData(client: Socket): Promise<SocketClientData | null> {
    try {
      return await this.socketDataService.getClientData(client.id);
    } catch (error) {
      this.logger.error(`Failed to get client data for socket ${client.id}:`, error);
      return null;
    }
  }

  /**
   * Set client data to Redis
   * @param client - The socket client
   * @param clientData - The client data to set
   * @returns Promise<boolean> - True if the data was set successfully
   */
  async setClientData(client: Socket, clientData: Partial<SocketClientData>): Promise<boolean> {
    try {
      // Get existing data first
      const existingData = await this.getClientData(client);

      // Merge with new data
      const mergedData: SocketClientData = {
        ...existingData,
        ...clientData,
        lastUpdated: Date.now(),
        socketId: client.id,
      };

      return await this.socketDataService.setClientData(client.id, mergedData);
    } catch (error) {
      this.logger.error(`Failed to set client data for socket ${client.id}:`, error);
      return false;
    }
  }

  /**
   * Remove client data from Redis
   * @param client - The socket client
   * @returns Promise<boolean> - True if the data was removed successfully
   */
  async removeClientData(client: Socket): Promise<boolean> {
    try {
      return await this.socketDataService.removeClientData(client.id);
    } catch (error) {
      this.logger.error(`Failed to remove client data for socket ${client.id}:`, error);
      return false;
    }
  }

  /**
   * Get all client data for a specific user
   * @param environmentId - The environment ID
   * @param externalUserId - The external user ID
   * @returns Promise<ClientData[]> - Array of client data for the user
   */
  async getUserClientData(
    environmentId: string,
    externalUserId: string,
  ): Promise<SocketClientData[]> {
    try {
      return await this.socketDataService.getUserClientData(environmentId, externalUserId);
    } catch (error) {
      this.logger.error(`Failed to get user client data for user ${externalUserId}:`, error);
      return [];
    }
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
  private buildExternalUserRoomId(environmentId: string, externalUserId: string): string {
    return `user:${environmentId}:${externalUserId}`;
  }

  // ============================================================================
  // WebSocket Event Helpers
  // ============================================================================

  /**
   * Track a client event
   * @param server - The server instance
   * @param room - The room to emit the event to
   * @param condition - The condition to emit
   */
  trackClientEvent(server: Server, room: string, condition: TrackCondition) {
    return server.to(room).emit('track-client-condition', condition);
  }

  /**
   * Un-track a client event
   * @param server - The server instance
   * @param room - The room to emit the event to
   * @param conditionId - The condition id to un-track
   */
  untrackClientEvent(server: Server, room: string, conditionId: string) {
    return server.to(room).emit('untrack-client-condition', {
      conditionId,
    });
  }

  /**
   * Set the flow session
   * @param server - The server instance
   * @param room - The room to emit the event to
   * @param session - The session to set
   */
  setFlowSession(server: Server, room: string, session: SDKContentSession) {
    return server.to(room).emit('set-flow-session', session);
  }

  /**
   * Set the checklist session
   * @param server - The server instance
   * @param room - The room to emit the event to
   * @param session - The session to set
   */
  setChecklistSession(server: Server, room: string, session: SDKContentSession) {
    return server.to(room).emit('set-checklist-session', session);
  }

  /**
   * Unset the flow session
   * @param server - The server instance
   * @param room - The room to emit the event to
   * @param sessionId - The session id to unset
   */
  unsetFlowSession(server: Server, room: string, sessionId: string) {
    return server.to(room).emit('unset-flow-session', { sessionId });
  }

  /**
   * Unset the checklist session
   * @param server - The server instance
   * @param room - The room to emit the event to
   * @param sessionId - The session id to unset
   */
  unsetChecklistSession(server: Server, room: string, sessionId: string) {
    return server.to(room).emit('unset-checklist-session', { sessionId });
  }

  /**
   * Force go to step
   * @param server - The server instance
   * @param room - The room to emit the event to
   * @param sessionId - The session id to force go to step
   * @param stepId - The step id to force go to step
   */
  forceGoToStep(server: Server, room: string, sessionId: string, stepId: string) {
    return server.to(room).emit('force-go-to-step', {
      sessionId,
      stepId,
    });
  }

  /**
   * Start condition wait timer
   * @param server - The server instance
   * @param room - The room to emit the event to
   * @param waitTimerCondition - The wait timer condition to start
   */
  startConditionWaitTimer(server: Server, room: string, waitTimerCondition: WaitTimerCondition) {
    return server.to(room).emit('start-condition-wait-timer', waitTimerCondition);
  }

  /**
   * Cancel condition wait timer
   * @param server - The server instance
   * @param room - The room to emit the event to
   * @param waitTimerCondition - The wait timer condition to cancel
   */
  cancelConditionWaitTimer(server: Server, room: string, waitTimerCondition: WaitTimerCondition) {
    return server.to(room).emit('cancel-condition-wait-timer', waitTimerCondition);
  }

  // ============================================================================
  // Content Session Management
  // ============================================================================

  /**
   * Get content session from client
   * @param client - The socket client
   * @param contentType - The content type
   * @returns Promise<SDKContentSession | null> - The content session or null
   */
  async getContentSession(
    client: Socket,
    contentType: ContentDataType,
  ): Promise<SDKContentSession | null> {
    try {
      const data = await this.getClientData(client);
      if (!data) {
        return null;
      }

      if (contentType === ContentDataType.FLOW) {
        return data.flowSession ?? null;
      }
      if (contentType === ContentDataType.CHECKLIST) {
        return data.checklistSession ?? null;
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get content session for socket ${client.id}:`, error);
      return null;
    }
  }

  /**
   * Set content session for client
   * @param server - The server instance
   * @param client - The socket client
   * @param session - The session to set
   * @returns Promise<void>
   */
  async setContentSession(
    server: Server,
    client: Socket,
    session: SDKContentSession,
  ): Promise<void> {
    try {
      const data = await this.getClientData(client);
      if (!data?.environment || !data?.externalUserId) {
        this.logger.warn(`Missing environment or user ID for socket ${client.id}`);
        return;
      }

      const room = this.buildExternalUserRoomId(data.environment.id, data.externalUserId);
      const contentType = session.content.type as ContentDataType;

      if (contentType === ContentDataType.FLOW) {
        await this.setClientData(client, { flowSession: session });
        this.setFlowSession(server, room, session);
      } else if (contentType === ContentDataType.CHECKLIST) {
        await this.setClientData(client, { checklistSession: session });
        this.setChecklistSession(server, room, session);
      }
    } catch (error) {
      this.logger.error(`Failed to set content session for socket ${client.id}:`, error);
    }
  }

  /**
   * Unset current content session for client
   * @param server - The server instance
   * @param client - The socket client
   * @param contentType - The content type to unset
   * @param sessionId - The session id to unset
   * @param emitWebSocket - Whether to emit WebSocket events (default: true)
   * @returns Promise<void>
   */
  async unsetCurrentContentSession(
    server: Server,
    client: Socket,
    contentType: ContentDataType,
    sessionId: string,
    emitWebSocket = true,
  ): Promise<void> {
    try {
      const data = await this.getClientData(client);
      if (!data?.environment || !data?.externalUserId || !sessionId) {
        return;
      }

      const room = this.buildExternalUserRoomId(data.environment.id, data.externalUserId);

      // Define session configuration based on content type
      const sessionConfig = {
        [ContentDataType.FLOW]: {
          currentSession: data.flowSession,
          unsetEvent: () => this.unsetFlowSession(server, room, sessionId),
          clientDataKey: 'flowSession' as const,
        },
        [ContentDataType.CHECKLIST]: {
          currentSession: data.checklistSession,
          unsetEvent: () => this.unsetChecklistSession(server, room, sessionId),
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
        await this.setClientData(client, { [config.clientDataKey]: undefined });
      }
    } catch (error) {
      this.logger.error(`Failed to unset content session for socket ${client.id}:`, error);
    }
  }

  // ============================================================================
  // Condition Tracking Management
  // ============================================================================

  /**
   * Track client conditions
   * @param server - The server instance
   * @param client - The socket client
   * @param trackConditions - The conditions to track
   * @returns Promise<void>
   */
  async trackClientConditions(
    server: Server,
    client: Socket,
    trackConditions: TrackCondition[],
  ): Promise<void> {
    try {
      // Early return if no conditions to track
      if (!trackConditions?.length) return;

      const data = await this.getClientData(client);
      if (!data?.environment || !data?.externalUserId) {
        this.logger.warn(`Missing environment or user ID for socket ${client.id}`);
        return;
      }

      const room = this.buildExternalUserRoomId(data.environment.id, data.externalUserId);
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
        this.trackClientEvent(server, room, condition),
      );

      // Update client data by merging with existing conditions
      await this.setClientData(client, {
        trackConditions: [...existingConditions, ...trackedConditions],
      });
    } catch (error) {
      this.logger.error(`Failed to track client conditions for socket ${client.id}:`, error);
    }
  }

  /**
   * Toggle specific client condition
   * @param client - The socket client
   * @param conditionId - The condition ID
   * @param isActive - Whether the condition is active
   * @returns Promise<boolean> - True if the condition was toggled successfully
   */
  async toggleClientCondition(
    client: Socket,
    conditionId: string,
    isActive: boolean,
  ): Promise<boolean> {
    try {
      const data = await this.getClientData(client);
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
      await this.setClientData(client, { trackConditions: updatedConditions });
      return true;
    } catch (error) {
      this.logger.error(`Failed to toggle client condition for socket ${client.id}:`, error);
      return false;
    }
  }

  /**
   * Untrack current conditions with optional exclusions
   * @param server - The server instance
   * @param client - The socket client
   * @param excludeConditionIds - Array of condition IDs to exclude from untracking
   * @returns Promise<void>
   */
  async untrackCurrentConditions(
    server: Server,
    client: Socket,
    excludeConditionIds?: string[],
  ): Promise<void> {
    try {
      const data = await this.getClientData(client);
      const trackConditions = data?.trackConditions ?? [];

      // Early return if no existing conditions to remove
      if (!trackConditions?.length) return;

      // Early return if no environment or user ID
      if (!data?.environment || !data?.externalUserId) {
        return;
      }

      const room = this.buildExternalUserRoomId(data.environment.id, data.externalUserId);

      // Determine which conditions to untrack
      const conditionsToUntrack = excludeConditionIds?.length
        ? trackConditions.filter((c) => !excludeConditionIds.includes(c.condition.id))
        : trackConditions;

      // Early return if no conditions to untrack
      if (!conditionsToUntrack.length) return;

      // Emit untrack events and collect successfully untracked conditions
      const untrackedConditions = conditionsToUntrack.filter((condition) =>
        this.untrackClientEvent(server, room, condition.condition.id),
      );

      // Update client data
      await this.setClientData(client, {
        trackConditions: trackConditions.filter(
          (condition) =>
            !untrackedConditions.some(
              (untracked) => untracked.condition.id === condition.condition.id,
            ),
        ),
      });
    } catch (error) {
      this.logger.error(`Failed to untrack client conditions for socket ${client.id}:`, error);
    }
  }

  // ============================================================================
  // Wait Timer Conditions Management
  // ============================================================================

  /**
   * Start wait timer conditions
   * @param server - The server instance
   * @param client - The socket client
   * @param startConditions - The conditions to start
   * @returns Promise<void>
   */
  async startWaitTimerConditions(
    server: Server,
    client: Socket,
    startConditions: WaitTimerCondition[],
  ): Promise<void> {
    try {
      // Early return if no conditions to start
      if (!startConditions?.length) return;

      const data = await this.getClientData(client);
      if (!data?.environment || !data?.externalUserId) {
        this.logger.warn(`Missing environment or user ID for socket ${client.id}`);
        return;
      }

      const room = this.buildExternalUserRoomId(data.environment.id, data.externalUserId);
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
        this.startConditionWaitTimer(server, room, condition),
      );

      // Update client data by merging with existing conditions
      await this.setClientData(client, {
        waitTimerConditions: [...existingConditions, ...startedConditions],
      });
    } catch (error) {
      this.logger.error(`Failed to start wait timer conditions for socket ${client.id}:`, error);
    }
  }

  /**
   * Fire specific client condition wait timer
   * @param client - The socket client
   * @param versionId - The version ID
   * @returns Promise<boolean> - True if the condition was fired successfully
   */
  async fireClientConditionWaitTimer(client: Socket, versionId: string): Promise<boolean> {
    try {
      const data = await this.getClientData(client);
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
      await this.setClientData(client, { waitTimerConditions: updatedConditions });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to fire client condition wait timer for socket ${client.id}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Cancel current wait timer conditions
   * @param server - The server instance
   * @param client - The socket client
   * @returns Promise<void>
   */
  async cancelCurrentWaitTimerConditions(server: Server, client: Socket): Promise<void> {
    try {
      const data = await this.getClientData(client);
      const waitTimerConditions = data?.waitTimerConditions ?? [];

      // Early return if no existing conditions to remove
      if (!waitTimerConditions?.length) return;

      if (!data?.environment || !data?.externalUserId) {
        this.logger.warn(`Missing environment or user ID for socket ${client.id}`);
        return;
      }

      const room = this.buildExternalUserRoomId(data.environment.id, data.externalUserId);

      // Filter out already activated conditions and emit cancellation events
      const conditionsToCancel = waitTimerConditions.filter((condition) => !condition.activated);

      // Emit cancellation events for non-activated conditions
      for (const condition of conditionsToCancel) {
        this.cancelConditionWaitTimer(server, room, condition);
      }

      // Clear all wait timer conditions from client data
      await this.setClientData(client, { waitTimerConditions: [] });
    } catch (error) {
      this.logger.error(`Failed to cancel wait timer conditions for socket ${client.id}:`, error);
    }
  }
}
