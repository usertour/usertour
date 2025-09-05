import { Server, Socket } from 'socket.io';
import { ContentDataType } from '@usertour/types';
import { SDKContentSession, TrackCondition } from '@/common/types/sdk';
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

type ClientData = {
  environment: Environment | undefined;
  externalUserId: string | undefined;
  externalCompanyId: string | undefined;
  trackConditions: TrackCondition[] | undefined;
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

  return {
    environment,
    externalUserId,
    externalCompanyId,
    trackConditions,
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

// ============================================================================
// Session Management Utils
// ============================================================================

/**
 * Get content session from client
 */
export function getContentSession(
  client: Socket,
  contentType: ContentDataType,
): SDKContentSession | null {
  const data = getClientData(client);
  if (contentType === ContentDataType.FLOW) {
    return data.flowSession ?? null;
  }
  if (contentType === ContentDataType.CHECKLIST) {
    return data.checklistSession ?? null;
  }
  return null;
}

/**
 * Set content session for client
 */
export function setContentSession(
  server: Server,
  client: Socket,
  session: SDKContentSession,
): void {
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
}

/**
 * Unset content session for client
 */
export function unsetContentSession(
  server: Server,
  client: Socket,
  contentType: ContentDataType,
  sessionId: string,
): void {
  const { environment, externalUserId } = getClientData(client);
  const room = getExternalUserRoom(environment.id, externalUserId);

  if (contentType === ContentDataType.FLOW) {
    unsetFlowSession(server, room, sessionId);
    setClientData(client, { flowSession: undefined });
  } else if (contentType === ContentDataType.CHECKLIST) {
    unsetChecklistSession(server, room, sessionId);
    setClientData(client, { checklistSession: undefined });
  }
}

/**
 * Unset session data only (no WebSocket emission)
 */
export function unsetSessionData(client: Socket, contentType: ContentDataType): void {
  if (contentType === ContentDataType.FLOW) {
    setClientData(client, { flowSession: undefined });
  } else if (contentType === ContentDataType.CHECKLIST) {
    setClientData(client, { checklistSession: undefined });
  }
}

// ============================================================================
// Condition Tracking Utils
// ============================================================================

/**
 * Track client conditions with performance optimization
 */
export function trackClientConditions(
  server: Server,
  client: Socket,
  trackConditions: TrackCondition[],
): void {
  const {
    environment,
    externalUserId,
    trackConditions: existingConditions,
  } = getClientData(client);
  const room = getExternalUserRoom(environment.id, externalUserId);

  // Use Map for O(1) lookup instead of find()
  const existingMap = new Map(
    existingConditions?.map((c) => [c.condition.id, c.condition.actived]) ?? [],
  );

  // Merge conditions with existing active states
  const conditions = trackConditions.map((trackCondition) => ({
    ...trackCondition,
    condition: {
      ...trackCondition.condition,
      actived: existingMap.get(trackCondition.condition.id) ?? false,
    },
  }));

  // Only emit new conditions
  const newConditions = conditions.filter((c) => !existingMap.has(c.condition.id));
  const emitTrackConditions = newConditions.filter((condition) =>
    trackClientEvent(server, room, condition),
  );

  setClientData(client, { trackConditions: emitTrackConditions });
}

/**
 * Toggle specific client condition
 */
export function toggleClientCondition(
  client: Socket,
  conditionId: string,
  isActive: boolean,
): boolean {
  const { trackConditions } = getClientData(client);

  if (!trackConditions) return false;

  // Check if condition was found
  const conditionExists = trackConditions.some((c) => c.condition.id === conditionId);
  if (!conditionExists) return false;

  // Find and update the condition
  const updatedConditions = trackConditions.map((trackCondition) => {
    if (trackCondition.condition.id === conditionId) {
      return {
        ...trackCondition,
        condition: {
          ...trackCondition.condition,
          actived: isActive,
        },
      };
    }
    return trackCondition;
  });

  // Update client data
  setClientData(client, { trackConditions: updatedConditions });
  return true;
}

/**
 * Untrack specific conditions
 */
export function untrackConditions(
  server: Server,
  client: Socket,
  untrackConditions: TrackCondition[],
): void {
  const { trackConditions, environment, externalUserId } = getClientData(client);
  const room = getExternalUserRoom(environment.id, externalUserId);

  const removedIds = untrackConditions
    .filter((condition) => untrackClientEvent(server, room, condition.condition.id))
    .map((condition) => condition.condition.id);

  if (removedIds.length && trackConditions) {
    setClientData(client, {
      trackConditions: trackConditions.filter(
        (condition) => !removedIds.includes(condition.condition.id),
      ),
    });
  }
}

/**
 * Untrack current conditions with optional exclusions
 */
export function untrackCurrentConditions(
  server: Server,
  client: Socket,
  excludeConditionIds?: string[],
): void {
  const { trackConditions } = getClientData(client);
  if (!trackConditions?.length) return;

  const conditionsToUntrack = excludeConditionIds
    ? trackConditions.filter((c) => !excludeConditionIds.includes(c.condition.id))
    : trackConditions;

  untrackConditions(server, client, conditionsToUntrack);
}
