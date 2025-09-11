import { Server, Socket } from 'socket.io';
import { ContentDataType } from '@usertour/types';
import { SDKContentSession, TrackCondition, WaitTimerCondition } from '@/common/types/sdk';
import { Environment } from '@/common/types/schema';

/**
 * Get the external user room
 * @param environmentId - The environment id
 * @param externalUserId - The external user id
 * @returns The external user room
 */
export const getExternalUserRoom = (environmentId: string, externalUserId: string) => {
  return `user:${environmentId}:${externalUserId}`;
};

// ============================================================================
// Client Data Utils
// ============================================================================

/**
 * Client data type
 */
export type ClientData = {
  environment: Environment | undefined;
  externalUserId: string | undefined;
  externalCompanyId: string | undefined;
  trackConditions: TrackCondition[] | undefined;
  waitTimerConditions: WaitTimerCondition[] | undefined;
  flowSession: SDKContentSession | undefined;
  checklistSession: SDKContentSession | undefined;
};

/**
 * Get the client data from the socket
 * @param client - The socket
 * @returns The client data
 */
export const getClientData = (client: Socket): ClientData => {
  const environment = client?.data?.environment as Environment | undefined;
  const externalUserId = client?.data?.externalUserId as string | undefined;
  const externalCompanyId = client?.data?.externalCompanyId as string | undefined;
  const trackConditions = (client?.data?.trackConditions as TrackCondition[] | undefined) ?? [];
  const flowSession = client?.data?.flowSession as SDKContentSession | undefined;
  const checklistSession = client?.data?.checklistSession as SDKContentSession | undefined;
  const waitTimerConditions =
    (client?.data?.waitTimerConditions as WaitTimerCondition[] | undefined) ?? [];

  return {
    environment,
    externalUserId,
    externalCompanyId,
    trackConditions,
    waitTimerConditions,
    flowSession,
    checklistSession,
  };
};

/**
 * Set the client data to the socket
 * @param client - The socket
 * @param clientData - The client data
 */
export const setClientData = (client: Socket, clientData: Partial<ClientData>) => {
  Object.assign(client.data, clientData);
};

// ============================================================================
// WebSocket Events Utils
// ============================================================================

/**
 * Track a client event
 * @param server - The server instance
 * @param room - The room to emit the event to
 * @param condition - The condition to emit
 */
export const trackClientEvent = (server: Server, room: string, condition: TrackCondition) => {
  return server.to(room).emit('track-client-condition', condition);
};

/**
 * Un-track a client event
 * @param server - The server instance
 * @param room - The room to emit the event to
 * @param conditionId - The condition id to un-track
 */
export const untrackClientEvent = (server: Server, room: string, conditionId: string) => {
  return server.to(room).emit('untrack-client-condition', {
    conditionId,
  });
};

/**
 * Unset the flow session
 * @param server - The server instance
 * @param room - The room to emit the event to
 * @param sessionId - The session id to unset
 */
export const unsetFlowSession = (server: Server, room: string, sessionId: string) => {
  return server.to(room).emit('unset-flow-session', { sessionId });
};

/**
 * Unset the checklist session
 * @param server - The server instance
 * @param room - The room to emit the event to
 * @param sessionId - The session id to unset
 */
export const unsetChecklistSession = (server: Server, room: string, sessionId: string) => {
  return server.to(room).emit('unset-checklist-session', { sessionId });
};

/**
 * Set the flow session
 * @param server - The server instance
 * @param room - The room to emit the event to
 * @param session - The session to set
 */
export const setFlowSession = (server: Server, room: string, session: SDKContentSession) => {
  return server.to(room).emit('set-flow-session', session);
};

/**
 * Set the checklist session
 * @param server - The server instance
 * @param room - The room to emit the event to
 * @param session - The session to set
 */
export const setChecklistSession = (server: Server, room: string, session: SDKContentSession) => {
  return server.to(room).emit('set-checklist-session', session);
};

/**
 * Force go to step
 * @param server - The server instance
 * @param room - The room to emit the event to
 * @param sessionId - The session id to force go to step
 * @param stepId - The step id to force go to step
 */
export const forceGoToStep = (server: Server, room: string, sessionId: string, stepId: string) => {
  return server.to(room).emit('force-go-to-step', {
    sessionId,
    stepId,
  });
};

/**
 * Start condition wait timer
 * @param server - The server instance
 * @param room - The room to emit the event to
 * @param waitTimerCondition - The wait timer condition to start
 */
export const startConditionWaitTimer = (
  server: Server,
  room: string,
  waitTimerCondition: WaitTimerCondition,
) => {
  return server.to(room).emit('start-condition-wait-timer', waitTimerCondition);
};

/**
 * Cancel condition wait timer
 * @param server - The server instance
 * @param room - The room to emit the event to
 * @param waitTimerCondition - The wait timer condition to cancel
 */
export const cancelConditionWaitTimer = (
  server: Server,
  room: string,
  waitTimerCondition: WaitTimerCondition,
) => {
  return server.to(room).emit('cancel-condition-wait-timer', waitTimerCondition);
};

// ============================================================================
// Session Management Utils
// ============================================================================

/**
 * Get content session from client
 */
export const getContentSession = (
  client: Socket,
  contentType: ContentDataType,
): SDKContentSession | null => {
  const data = getClientData(client);
  if (contentType === ContentDataType.FLOW) {
    return data.flowSession ?? null;
  }
  if (contentType === ContentDataType.CHECKLIST) {
    return data.checklistSession ?? null;
  }
  return null;
};

/**
 * Set content session for client
 */
export const setContentSession = (
  server: Server,
  client: Socket,
  session: SDKContentSession,
): void => {
  const { environment, externalUserId } = getClientData(client);
  const room = getExternalUserRoom(environment.id, externalUserId);
  const contentType = session.content.type as ContentDataType;

  if (contentType === ContentDataType.FLOW) {
    setClientData(client, { flowSession: session });
    setFlowSession(server, room, session);
  } else if (contentType === ContentDataType.CHECKLIST) {
    setClientData(client, { checklistSession: session });
    setChecklistSession(server, room, session);
  }
};

/**
 * Unset current content session for client
 * @param server - The server instance
 * @param client - The socket client
 * @param contentType - The content type to unset
 * @param sessionId - The session id to unset
 * @param emitWebSocket - Whether to emit WebSocket events (default: true)
 */
export const unsetCurrentContentSession = (
  server: Server,
  client: Socket,
  contentType: ContentDataType,
  sessionId: string,
  emitWebSocket = true,
): void => {
  const { environment, externalUserId, flowSession, checklistSession } = getClientData(client);

  // Early return if no environment or user ID
  if (!environment || !externalUserId || !sessionId) {
    return;
  }

  const room = getExternalUserRoom(environment.id, externalUserId);

  // Define session configuration based on content type
  const sessionConfig = {
    [ContentDataType.FLOW]: {
      currentSession: flowSession,
      unsetEvent: () => unsetFlowSession(server, room, sessionId),
      clientDataKey: 'flowSession' as const,
    },
    [ContentDataType.CHECKLIST]: {
      currentSession: checklistSession,
      unsetEvent: () => unsetChecklistSession(server, room, sessionId),
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
    setClientData(client, { [config.clientDataKey]: undefined });
  }
};

// ============================================================================
// Condition Tracking Utils
// ============================================================================

/**
 * Track client conditions
 */
export const trackClientConditions = (
  server: Server,
  client: Socket,
  trackConditions: TrackCondition[],
): void => {
  // Early return if no conditions to track
  if (!trackConditions?.length) return;

  const {
    environment,
    externalUserId,
    trackConditions: existingConditions,
  } = getClientData(client);
  const room = getExternalUserRoom(environment.id, externalUserId);

  // Filter out conditions that already exist
  const newConditions = trackConditions.filter(
    (condition) =>
      !existingConditions?.some((existing) => existing.condition.id === condition.condition.id),
  );

  // Early return if no new conditions to track
  if (!newConditions.length) return;

  // Emit track events and collect successfully tracked conditions
  const trackedConditions = newConditions.filter((condition) =>
    trackClientEvent(server, room, condition),
  );

  // Update client data by merging with existing conditions
  setClientData(client, {
    trackConditions: [...(existingConditions ?? []), ...trackedConditions],
  });
};

/**
 * Toggle specific client condition
 */
export const toggleClientCondition = (
  client: Socket,
  conditionId: string,
  isActive: boolean,
): boolean => {
  const { trackConditions } = getClientData(client);

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
  setClientData(client, { trackConditions: updatedConditions });
  return true;
};

/**
 * Untrack current conditions with optional exclusions
 * @param server - The server instance
 * @param client - The socket client
 * @param excludeConditionIds - Array of condition IDs to exclude from untracking (untrack all others)
 */
export const untrackCurrentConditions = (
  server: Server,
  client: Socket,
  excludeConditionIds?: string[],
): void => {
  const { trackConditions, environment, externalUserId } = getClientData(client);

  // Early return if no existing conditions to remove
  if (!trackConditions?.length) return;

  // Early return if no environment or user ID
  if (!environment || !externalUserId) {
    return;
  }

  const room = getExternalUserRoom(environment.id, externalUserId);

  // Determine which conditions to untrack
  const conditionsToUntrack = excludeConditionIds?.length
    ? trackConditions.filter((c) => !excludeConditionIds.includes(c.condition.id))
    : trackConditions;

  // Early return if no conditions to untrack
  if (!conditionsToUntrack.length) return;

  // Emit untrack events and collect successfully untracked conditions
  const untrackedConditions = conditionsToUntrack.filter((condition) =>
    untrackClientEvent(server, room, condition.condition.id),
  );

  // Update client data
  setClientData(client, {
    trackConditions: trackConditions.filter(
      (condition) =>
        !untrackedConditions.some((untracked) => untracked.condition.id === condition.condition.id),
    ),
  });
};

// ============================================================================
// Wait Timer Conditions Utils
// ============================================================================

/**
 * Start wait timer conditions
 */
export const startWaitTimerConditions = (
  server: Server,
  client: Socket,
  startConditions: WaitTimerCondition[],
): void => {
  // Early return if no conditions to start
  if (!startConditions?.length) return;

  const {
    environment,
    externalUserId,
    waitTimerConditions: existingConditions,
  } = getClientData(client);
  const room = getExternalUserRoom(environment.id, externalUserId);

  // Filter out conditions that already exist
  const newConditions = startConditions.filter(
    (condition) =>
      !existingConditions?.some((existing) => existing.versionId === condition.versionId),
  );

  // Early return if no new conditions to start
  if (!newConditions.length) return;

  // Emit start events and collect successfully started conditions
  const startedConditions = newConditions.filter((condition) =>
    startConditionWaitTimer(server, room, condition),
  );

  // Update client data by merging with existing conditions
  setClientData(client, {
    waitTimerConditions: [...(existingConditions ?? []), ...startedConditions],
  });
};

/**
 * Fire specific client condition wait timer
 */
export const fireClientConditionWaitTimer = (client: Socket, versionId: string): boolean => {
  const { waitTimerConditions } = getClientData(client);

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
  setClientData(client, { waitTimerConditions: updatedConditions });
  return true;
};

/**
 * Cancel current wait timer conditions
 */
export const cancelCurrentWaitTimerConditions = (server: Server, client: Socket): void => {
  const { waitTimerConditions, environment, externalUserId } = getClientData(client);

  // Early return if no existing conditions to remove
  if (!waitTimerConditions?.length) return;

  const room = getExternalUserRoom(environment.id, externalUserId);

  // Filter out already activated conditions and emit cancellation events
  const conditionsToCancel = waitTimerConditions.filter((condition) => !condition.activated);

  // Emit cancellation events for non-activated conditions
  for (const condition of conditionsToCancel) {
    cancelConditionWaitTimer(server, room, condition);
  }

  // Clear all wait timer conditions from client data
  setClientData(client, { waitTimerConditions: [] });
};
