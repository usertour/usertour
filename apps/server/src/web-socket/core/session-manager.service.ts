import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { ContentDataType } from '@usertour/types';
import { SDKContentSession, TrackCondition, SocketClientData } from '@/common/types';
import { SocketDataService } from './socket-data.service';
import { SocketEmitterService } from './socket-emitter.service';
import { ConditionEmitterService } from './condition-emitter.service';
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
 * Delegates session creation and manipulation to SessionDataService
 */
@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);

  constructor(
    private readonly socketDataService: SocketDataService,
    private readonly socketEmitterService: SocketEmitterService,
    private readonly conditionEmitterService: ConditionEmitterService,
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
      this.conditionEmitterService.untrackClientConditions(socket, clientConditions),
      this.conditionEmitterService.cancelConditionWaitTimers(socket, conditionWaitTimers),
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
    const updateClientData = {
      clientConditions: remainingConditions,
      conditionWaitTimers: remainingTimers,
      ...(contentType === ContentDataType.FLOW && {
        lastActivatedFlowSession: flowSession,
        flowSession: undefined,
      }),
      ...(contentType === ContentDataType.CHECKLIST && {
        lastActivatedChecklistSession: checklistSession,
        checklistSession: undefined,
      }),
    };

    return await this.socketDataService.updateClientData(socket.id, updateClientData);
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
      this.conditionEmitterService.untrackClientConditions(socket, conditionsToUntrack),
      this.conditionEmitterService.cancelConditionWaitTimers(socket, conditionWaitTimers),
      this.conditionEmitterService.trackClientConditions(socket, conditionsToTrack),
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

    // Update client data with session and all condition changes in one call
    const contentType = session.content.type as ContentDataType;
    const updateClientData = {
      clientConditions: [...preservedConditions, ...remainingConditions, ...newConditions],
      conditionWaitTimers: remainingTimers,
      ...(contentType === ContentDataType.FLOW && { flowSession: session }),
      ...(contentType === ContentDataType.CHECKLIST && { checklistSession: session }),
    };

    return await this.socketDataService.updateClientData(socket.id, updateClientData);
  }
}
