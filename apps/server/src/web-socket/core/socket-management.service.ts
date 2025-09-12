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
   * Set complete client data to Redis (for initialization)
   * @param client - The socket client
   * @param clientData - The complete client data to set (without lastUpdated and socketId)
   * @returns Promise<boolean> - True if the data was set successfully
   */
  async setClientData(
    client: Socket,
    clientData: Omit<SocketClientData, 'lastUpdated' | 'socketId'>,
  ): Promise<boolean> {
    try {
      const data: SocketClientData = {
        ...clientData,
        lastUpdated: Date.now(),
        socketId: client.id,
      };
      return await this.socketDataService.setClientData(client.id, data);
    } catch (error) {
      this.logger.error(`Failed to set client data for socket ${client.id}:`, error);
      return false;
    }
  }

  /**
   * Update partial client data in Redis
   * @param client - The socket client
   * @param updates - The partial data to update
   * @returns Promise<boolean> - True if the data was updated successfully
   */
  async updateClientData(client: Socket, updates: Partial<SocketClientData>): Promise<boolean> {
    try {
      const existingData = await this.getClientData(client);
      if (!existingData) {
        this.logger.error(
          `Client data not found for socket ${client.id}. Use setClientData first.`,
        );
        return false;
      }

      const mergedData: SocketClientData = {
        ...existingData,
        ...updates,
        lastUpdated: Date.now(),
        socketId: client.id,
      };
      return await this.socketDataService.setClientData(client.id, mergedData);
    } catch (error) {
      this.logger.error(`Failed to update client data for socket ${client.id}:`, error);
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
  buildExternalUserRoomId(environmentId: string, externalUserId: string): string {
    return `user:${environmentId}:${externalUserId}`;
  }

  // ============================================================================
  // WebSocket Event Helpers
  // ============================================================================

  /**
   * Track a client event
   * @param client - The socket client
   * @param condition - The condition to emit
   */
  private trackClientEvent(client: Socket, condition: TrackCondition) {
    return client.emit('track-client-condition', condition);
  }

  /**
   * Un-track a client event
   * @param client - The socket client
   * @param conditionId - The condition id to un-track
   */
  private untrackClientEvent(client: Socket, conditionId: string) {
    return client.emit('untrack-client-condition', {
      conditionId,
    });
  }

  /**
   * Set the flow session
   * @param client - The socket clientj
   * @param session - The session to set
   */
  private setFlowSession(client: Socket, session: SDKContentSession) {
    return client.emit('set-flow-session', session);
  }

  /**
   * Set the checklist session
   * @param client - The socket client
   * @param session - The session to set
   */
  private setChecklistSession(client: Socket, session: SDKContentSession) {
    return client.emit('set-checklist-session', session);
  }

  /**
   * Unset the flow session
   * @param client - The socket client
   * @param sessionId - The session id to unset
   */
  unsetFlowSession(client: Socket, sessionId: string) {
    return client.emit('unset-flow-session', { sessionId });
  }

  /**
   * Unset the checklist session
   * @param client - The socket client
   * @param sessionId - The session id to unset
   */
  unsetChecklistSession(client: Socket, sessionId: string) {
    return client.emit('unset-checklist-session', { sessionId });
  }

  /**
   * Force go to step
   * @param client - The socket client
   * @param sessionId - The session id to force go to step
   * @param stepId - The step id to force go to step
   */
  forceGoToStep(client: Socket, sessionId: string, stepId: string) {
    return client.emit('force-go-to-step', {
      sessionId,
      stepId,
    });
  }

  /**
   * Start condition wait timer
   * @param client - The socket client
   * @param waitTimerCondition - The wait timer condition to start
   */
  startConditionWaitTimer(client: Socket, waitTimerCondition: WaitTimerCondition) {
    return client.emit('start-condition-wait-timer', waitTimerCondition);
  }

  /**
   * Cancel condition wait timer
   * @param client - The socket client
   * @param waitTimerCondition - The wait timer condition to cancel
   */
  cancelConditionWaitTimer(client: Socket, waitTimerCondition: WaitTimerCondition) {
    return client.emit('cancel-condition-wait-timer', waitTimerCondition);
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
  async getSessionByContentType(
    client: Socket,
    contentType: ContentDataType,
  ): Promise<SDKContentSession | null> {
    try {
      const data = await this.getClientData(client);
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
    } catch (error) {
      this.logger.error(`Failed to get content session for socket ${client.id}:`, error);
      return null;
    }
  }

  /**
   * Set content session for client
   * @param client - The socket client
   * @param session - The session to set
   * @returns Promise<void>
   */
  async setContentSession(client: Socket, session: SDKContentSession): Promise<void> {
    try {
      const data = await this.getClientData(client);
      if (!data?.environment || !data?.externalUserId) {
        this.logger.warn(`Missing environment or user ID for socket ${client.id}`);
        return;
      }

      const contentType = session.content.type as ContentDataType;

      switch (contentType) {
        case ContentDataType.FLOW:
          await this.updateClientData(client, { flowSession: session });
          this.setFlowSession(client, session);
          break;
        case ContentDataType.CHECKLIST:
          await this.updateClientData(client, { checklistSession: session });
          this.setChecklistSession(client, session);
          break;
        default:
          this.logger.warn(`Unsupported content type: ${contentType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to set content session for socket ${client.id}:`, error);
    }
  }

  /**
   * Unset current content session for client
   * @param client - The socket client
   * @param contentType - The content type to unset
   * @param sessionId - The session id to unset
   * @param emitWebSocket - Whether to emit WebSocket events (default: true)
   * @returns Promise<void>
   */
  async unsetCurrentContentSession(
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

      // Define session configuration based on content type
      const sessionConfig = {
        [ContentDataType.FLOW]: {
          currentSession: data.flowSession,
          unsetEvent: () => this.unsetFlowSession(client, sessionId),
          clientDataKey: 'flowSession' as const,
        },
        [ContentDataType.CHECKLIST]: {
          currentSession: data.checklistSession,
          unsetEvent: () => this.unsetChecklistSession(client, sessionId),
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
        await this.updateClientData(client, { [config.clientDataKey]: undefined });
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
   * @param client - The socket client
   * @param trackConditions - The conditions to track
   * @returns Promise<void>
   */
  async trackClientConditions(client: Socket, trackConditions: TrackCondition[]): Promise<void> {
    try {
      // Early return if no conditions to track
      if (!trackConditions?.length) return;

      const data = await this.getClientData(client);
      if (!data?.environment || !data?.externalUserId) {
        this.logger.warn(`Missing environment or user ID for socket ${client.id}`);
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
        this.trackClientEvent(client, condition),
      );

      // Update client data by merging with existing conditions
      await this.updateClientData(client, {
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
      await this.updateClientData(client, { trackConditions: updatedConditions });
      return true;
    } catch (error) {
      this.logger.error(`Failed to toggle client condition for socket ${client.id}:`, error);
      return false;
    }
  }

  /**
   * Untrack current conditions with optional exclusions
   * @param client - The socket client
   * @param excludeConditionIds - Array of condition IDs to exclude from untracking
   * @returns Promise<void>
   */
  async untrackCurrentConditions(client: Socket, excludeConditionIds?: string[]): Promise<void> {
    try {
      const data = await this.getClientData(client);
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
        this.untrackClientEvent(client, condition.condition.id),
      );

      // Update client data
      await this.updateClientData(client, {
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
   * @param client - The socket client
   * @param startConditions - The conditions to start
   * @returns Promise<void>
   */
  async startWaitTimerConditions(
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
        this.startConditionWaitTimer(client, condition),
      );

      // Update client data by merging with existing conditions
      await this.updateClientData(client, {
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
      await this.updateClientData(client, { waitTimerConditions: updatedConditions });
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
   * @param client - The socket client
   * @returns Promise<void>
   */
  async cancelCurrentWaitTimerConditions(client: Socket): Promise<void> {
    try {
      const data = await this.getClientData(client);
      const waitTimerConditions = data?.waitTimerConditions ?? [];

      // Early return if no existing conditions to remove
      if (!waitTimerConditions?.length) return;

      if (!data?.environment || !data?.externalUserId) {
        this.logger.warn(`Missing environment or user ID for socket ${client.id}`);
        return;
      }

      // Filter out already activated conditions and emit cancellation events
      const conditionsToCancel = waitTimerConditions.filter((condition) => !condition.activated);

      // Emit cancellation events for non-activated conditions
      for (const condition of conditionsToCancel) {
        this.cancelConditionWaitTimer(client, condition);
      }

      // Clear all wait timer conditions from client data
      await this.updateClientData(client, { waitTimerConditions: [] });
    } catch (error) {
      this.logger.error(`Failed to cancel wait timer conditions for socket ${client.id}:`, error);
    }
  }
}
