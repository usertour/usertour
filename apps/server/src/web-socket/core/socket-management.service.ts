import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ContentDataType } from '@usertour/types';
import { SDKContentSession, TrackCondition, WaitTimerCondition } from '@/common/types/sdk';
import { SocketDataService, SocketClientData } from './socket-data.service';
import { SocketEmitterService } from './socket-emitter.service';

/**
 * Socket management service
 * Handles socket data management and business logic
 * WebSocket event emissions are handled by SocketEmitterService
 */
@Injectable()
export class SocketManagementService {
  private readonly logger = new Logger(SocketManagementService.name);

  constructor(
    private readonly socketDataService: SocketDataService,
    private readonly socketEmitterService: SocketEmitterService,
  ) {}

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Validate client data for socket operations
   * @param data - The client data to validate
   * @param socketId - The socket ID for logging
   * @returns True if the data is valid for socket operations
   */
  private validateClientDataForSocketOps(data: SocketClientData | null, socketId: string): boolean {
    if (!data?.environment || !data?.externalUserId) {
      this.logger.warn(`Missing environment or user ID for socket ${socketId}`);
      return false;
    }
    return true;
  }

  /**
   * Get and validate client data
   * @param socketId - The socket ID
   * @returns Promise<SocketClientData | null> - Valid client data or null
   */
  private async getValidatedClientData(socketId: string): Promise<SocketClientData | null> {
    const data = await this.socketDataService.getClientData(socketId);
    if (!this.validateClientDataForSocketOps(data, socketId)) {
      return null;
    }
    return data;
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
    const data = await this.socketDataService.getClientData(socketId);
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
      if (!sessionId) return;

      const data = await this.getValidatedClientData(socket.id);
      if (!data) return;

      const sessionConfig = this.getSessionConfig(contentType, data, socket, sessionId);
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
   * Get session configuration for content type
   * @private
   */
  private getSessionConfig(
    contentType: ContentDataType,
    data: SocketClientData,
    socket: Socket,
    sessionId: string,
  ) {
    const configs = {
      [ContentDataType.FLOW]: {
        currentSession: data.flowSession,
        unsetEvent: () => this.socketEmitterService.unsetFlowSession(socket, sessionId),
        clientDataKey: 'flowSession' as const,
      },
      [ContentDataType.CHECKLIST]: {
        currentSession: data.checklistSession,
        unsetEvent: () => this.socketEmitterService.unsetChecklistSession(socket, sessionId),
        clientDataKey: 'checklistSession' as const,
      },
    };

    return configs[contentType] || null;
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

      const data = await this.getValidatedClientData(socket.id);
      if (!data) return;

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
        this.socketEmitterService.trackClientEvent(socket, condition),
      );

      // Update client data by merging with existing conditions
      await this.socketDataService.updateClientData(socket.id, {
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
      const data = await this.socketDataService.getClientData(socket.id);
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
      await this.socketDataService.updateClientData(socket.id, {
        trackConditions: updatedConditions,
      });
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
      const data = await this.getValidatedClientData(socket.id);
      if (!data) return;

      const trackConditions = data.trackConditions ?? [];

      // Early return if no existing conditions to remove
      if (!trackConditions?.length) return;

      // Determine which conditions to untrack
      const conditionsToUntrack = excludeConditionIds?.length
        ? trackConditions.filter((c) => !excludeConditionIds.includes(c.condition.id))
        : trackConditions;

      // Early return if no conditions to untrack
      if (!conditionsToUntrack.length) return;

      // Emit untrack events and collect successfully untracked conditions
      const untrackedConditions = conditionsToUntrack.filter((condition) =>
        this.socketEmitterService.untrackClientEvent(socket, condition.condition.id),
      );

      // Update client data
      await this.socketDataService.updateClientData(socket.id, {
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

      const data = await this.getValidatedClientData(socket.id);
      if (!data) return;

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
        this.socketEmitterService.startConditionWaitTimer(socket, condition),
      );

      // Update client data by merging with existing conditions
      await this.socketDataService.updateClientData(socket.id, {
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
      const data = await this.socketDataService.getClientData(socket.id);
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
      await this.socketDataService.updateClientData(socket.id, {
        waitTimerConditions: updatedConditions,
      });
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
      const data = await this.getValidatedClientData(socket.id);
      if (!data) return;

      const waitTimerConditions = data.waitTimerConditions ?? [];

      // Early return if no existing conditions to remove
      if (!waitTimerConditions?.length) return;

      // Filter out already activated conditions and emit cancellation events
      const conditionsToCancel = waitTimerConditions.filter((condition) => !condition.activated);

      // Emit cancellation events for non-activated conditions
      for (const condition of conditionsToCancel) {
        this.socketEmitterService.cancelConditionWaitTimer(socket, condition);
      }

      // Clear all wait timer conditions from client data
      await this.socketDataService.updateClientData(socket.id, { waitTimerConditions: [] });
    } catch (error) {
      this.logger.error(`Failed to cancel wait timer conditions for socket ${socket.id}:`, error);
    }
  }
}
