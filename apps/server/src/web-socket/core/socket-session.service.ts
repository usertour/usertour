import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ContentDataType } from '@usertour/types';
import {
  SDKContentSession,
  TrackCondition,
  SocketClientData,
  ClientCondition,
} from '@/common/types';
import { SocketRedisService } from './socket-redis.service';
import { SocketEmitterService } from './socket-emitter.service';
import { SocketParallelService } from './socket-parallel.service';
import {
  extractContentTypeBySessionId,
  categorizeClientConditions,
  calculateRemainingClientConditions,
  calculateRemainingConditionWaitTimers,
} from '@/utils/websocket-utils';

/**
 * Content session manager service
 * Handles content session management for Flow and Checklist content types
 * Focused on session lifecycle management, data persistence, and WebSocket communication
 * Delegates session creation and manipulation to SessionBuilderService
 */
@Injectable()
export class SocketSessionService {
  private readonly logger = new Logger(SocketSessionService.name);

  constructor(
    private readonly socketRedisService: SocketRedisService,
    private readonly socketEmitterService: SocketEmitterService,
    private readonly socketParallelService: SocketParallelService,
  ) {}

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
   * Emit unset socket session event with acknowledgment
   * @param socket - The socket instance
   * @param sessionId - The session id to unset
   * @param contentType - The content type
   * @returns Promise<boolean> - True if the session was unset and acknowledged by client
   */
  private async unsetSocketSession(
    socket: Socket,
    sessionId: string,
    contentType: ContentDataType,
  ): Promise<boolean> {
    switch (contentType) {
      case ContentDataType.FLOW:
        return await this.socketEmitterService.unsetFlowSession(socket, sessionId);
      case ContentDataType.CHECKLIST:
        return await this.socketEmitterService.unsetChecklistSession(socket, sessionId);
      default:
        this.logger.warn(`Unsupported content type: ${contentType}`);
        return false;
    }
  }

  /**
   * Calculate condition IDs that are no longer needed and should be removed
   * @param socket - The socket instance
   * @param currentConditions - The current conditions to compare against
   * @returns Promise<string[]> - Array of condition IDs to remove
   */
  private async extractRemovedConditionIds(
    socket: Socket,
    currentConditions: ClientCondition[],
  ): Promise<string[]> {
    const clientConditionReports = await this.socketRedisService.getClientConditionReports(
      socket.id,
    );
    const obsoleteReports = calculateRemainingClientConditions(
      clientConditionReports,
      currentConditions,
    );
    return obsoleteReports.map((report) => report.conditionId);
  }

  /**
   * Cleanup socket session and associated conditions
   * @param socket - The socket instance
   * @param socketClientData - The socket client data
   * @param sessionId - The session id to cleanup
   * @returns Promise<boolean> - True if the session was cleaned up successfully
   */
  async cleanupSocketSession(
    socket: Socket,
    socketClientData: SocketClientData,
    sessionId: string,
  ): Promise<boolean> {
    const { clientConditions, flowSession, checklistSession, conditionWaitTimers } =
      socketClientData;
    const contentType = extractContentTypeBySessionId(socketClientData, sessionId);
    // If the session is not found, return false
    if (!contentType) {
      return false;
    }
    // Send WebSocket messages first, return false if any fails
    const targetSessionId =
      contentType === ContentDataType.FLOW ? flowSession.id : checklistSession.id;
    const isUnset = await this.unsetSocketSession(socket, targetSessionId, contentType);
    if (!isUnset) {
      return false;
    }

    // Process condition cleanup operations in parallel
    const [untrackedConditions, cancelledTimers] = await Promise.all([
      this.socketParallelService.untrackClientConditions(socket, clientConditions),
      this.socketParallelService.cancelConditionWaitTimers(socket, conditionWaitTimers),
    ]);

    // Calculate remaining conditions and timers (those that failed to process)
    const remainingConditions = calculateRemainingClientConditions(
      clientConditions,
      untrackedConditions,
    );
    const remainingTimers = calculateRemainingConditionWaitTimers(
      conditionWaitTimers,
      cancelledTimers,
    );
    // Update client data with session clearing and remaining conditions/timers in one call
    const updatedClientData = {
      clientConditions: remainingConditions,
      conditionWaitTimers: remainingTimers,
      ...(contentType === ContentDataType.FLOW && {
        lastActivatedFlowId: flowSession.content.id,
        flowSession: undefined,
      }),
      ...(contentType === ContentDataType.CHECKLIST && {
        lastActivatedChecklistId: checklistSession.content.id,
        checklistSession: undefined,
      }),
    };

    // Get condition IDs to cleanup for atomic operation
    const conditionIdsToRemove = await this.extractRemovedConditionIds(socket, remainingConditions);

    // Use atomic operation to update client data and cleanup conditions
    return await this.socketRedisService.updateAndCleanup(
      socket.id,
      updatedClientData,
      conditionIdsToRemove,
    );
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
    const isSetSession = await this.setSocketSession(socket, session);
    if (!isSetSession) {
      return false;
    }
    if (forceGoToStep && session.currentStep?.id) {
      await this.socketEmitterService.forceGoToStep(socket, session.id, session.currentStep.id);
    }

    // Process condition updates efficiently
    const { preservedConditions, conditionsToUntrack, conditionsToTrack } =
      categorizeClientConditions(clientConditions, trackHideConditions);

    // Execute all condition operations in parallel
    const [untrackedConditions, cancelledTimers, newConditions] = await Promise.all([
      this.socketParallelService.untrackClientConditions(socket, conditionsToUntrack),
      this.socketParallelService.cancelConditionWaitTimers(socket, conditionWaitTimers),
      this.socketParallelService.trackClientConditions(socket, conditionsToTrack),
    ]);

    // Calculate remaining conditions and timers (those that failed to process)
    const remainingConditions = calculateRemainingClientConditions(
      conditionsToUntrack,
      untrackedConditions,
    );
    const remainingTimers = calculateRemainingConditionWaitTimers(
      conditionWaitTimers,
      cancelledTimers,
    );

    const updatedConditions = [...preservedConditions, ...remainingConditions, ...newConditions];

    // Update client data with session and all condition changes in one call
    const contentType = session.content.type as ContentDataType;
    const updatedClientData: Partial<SocketClientData> = {
      clientConditions: updatedConditions,
      conditionWaitTimers: remainingTimers,
      ...(contentType === ContentDataType.FLOW && { flowSession: session }),
      ...(contentType === ContentDataType.CHECKLIST && { checklistSession: session }),
    };

    // Get condition IDs to cleanup for atomic operation
    const conditionIdsToRemove = await this.extractRemovedConditionIds(socket, updatedConditions);

    // Use atomic operation to update client data and cleanup conditions
    return await this.socketRedisService.updateAndCleanup(
      socket.id,
      updatedClientData,
      conditionIdsToRemove,
    );
  }
}
