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
  // Content Session Management
  // ============================================================================

  /**
   * Get content session from socket
   * @param socketClientData - The socket socket data
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
   * Set content session for socket
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

  // ============================================================================
  // Condition Tracking Management
  // ============================================================================

  /**
   * Track socket conditions
   * @param socket - The socket
   * @param trackConditions - The conditions to track
   * @returns Promise<void>
   */
  async trackClientConditions(
    socket: Socket,
    socketClientData: SocketClientData,
    trackConditions: TrackCondition[],
  ): Promise<void> {
    try {
      // Early return if no conditions to track
      if (!trackConditions?.length) return;

      if (!socketClientData) return;

      const existingConditions = socketClientData.trackConditions ?? [];

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

      // Update socket data by merging with existing conditions
      await this.socketDataService.updateClientData(socket.id, {
        trackConditions: [...existingConditions, ...trackedConditions],
      });
    } catch (error) {
      this.logger.error(`Failed to track socket conditions for socket ${socket.id}:`, error);
    }
  }

  /**
   * Toggle specific socket condition
   * @param socket - The socket
   * @param conditionId - The condition ID
   * @param isActive - Whether the condition is active
   * @returns Promise<boolean> - True if the condition was toggled successfully
   */
  async toggleClientCondition(
    socket: Socket,
    socketClientData: SocketClientData,
    conditionId: string,
    isActive: boolean,
  ): Promise<boolean> {
    try {
      const trackConditions = socketClientData.trackConditions ?? [];

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

      // Update socket data
      await this.socketDataService.updateClientData(socket.id, {
        trackConditions: updatedConditions,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to toggle socket condition for socket ${socket.id}:`, error);
      return false;
    }
  }

  /**
   * Untrack current conditions with optional exclusions
   * @param socket - The socket
   * @param socketClientData - The socket socket data
   * @param excludeConditionIds - Array of condition IDs to exclude from untracking
   * @returns Promise<void>
   */
  async untrackCurrentConditions(
    socket: Socket,
    socketClientData: SocketClientData,
    excludeConditionIds?: string[],
  ): Promise<void> {
    try {
      if (!socketClientData) return;

      const trackConditions = socketClientData.trackConditions ?? [];

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

      // Update socket data
      await this.socketDataService.updateClientData(socket.id, {
        trackConditions: trackConditions.filter(
          (condition) =>
            !untrackedConditions.some(
              (untracked) => untracked.condition.id === condition.condition.id,
            ),
        ),
      });
    } catch (error) {
      this.logger.error(`Failed to untrack socket conditions for socket ${socket.id}:`, error);
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
    socketClientData: SocketClientData,
    startConditions: WaitTimerCondition[],
  ): Promise<void> {
    try {
      // Early return if no conditions to start
      if (!startConditions?.length) return;

      if (!socketClientData) return;

      const existingConditions = socketClientData.waitTimerConditions ?? [];

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

      // Update socket data by merging with existing conditions
      await this.socketDataService.updateClientData(socket.id, {
        waitTimerConditions: [...existingConditions, ...startedConditions],
      });
    } catch (error) {
      this.logger.error(`Failed to start wait timer conditions for socket ${socket.id}:`, error);
    }
  }

  /**
   * Fire specific socket condition wait timer
   * @param socket - The socket
   * @param versionId - The version ID
   * @returns Promise<boolean> - True if the condition was fired successfully
   */
  async fireClientConditionWaitTimer(
    socket: Socket,
    socketClientData: SocketClientData,
    versionId: string,
  ): Promise<boolean> {
    try {
      const waitTimerConditions = socketClientData.waitTimerConditions ?? [];

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

      // Update socket data
      await this.socketDataService.updateClientData(socket.id, {
        waitTimerConditions: updatedConditions,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to fire socket condition wait timer for socket ${socket.id}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Cancel current wait timer conditions
   * @param socket - The socket
   * @param socketClientData - The socket socket data
   * @returns Promise<void>
   */
  async cancelCurrentWaitTimerConditions(
    socket: Socket,
    socketClientData: SocketClientData,
  ): Promise<void> {
    try {
      if (!socketClientData) return;

      const waitTimerConditions = socketClientData.waitTimerConditions ?? [];

      // Early return if no existing conditions to remove
      if (!waitTimerConditions?.length) return;

      // Filter out already activated conditions and emit cancellation events
      const conditionsToCancel = waitTimerConditions.filter((condition) => !condition.activated);

      // Emit cancellation events for non-activated conditions
      for (const condition of conditionsToCancel) {
        this.socketEmitterService.cancelConditionWaitTimer(socket, condition);
      }

      // Clear all wait timer conditions from socket data
      await this.socketDataService.updateClientData(socket.id, { waitTimerConditions: [] });
    } catch (error) {
      this.logger.error(`Failed to cancel wait timer conditions for socket ${socket.id}:`, error);
    }
  }
}
