import { Environment } from '@/common/types/schema';
import { SDKContentSession, TrackCondition } from '@/common/types/sdk';
import { ContentDataType } from '@usertour/types';
import { Server, Socket } from 'socket.io';

type ClientData = {
  environment: Environment | undefined;
  externalUserId: string | undefined;
  externalCompanyId: string | undefined;
  trackConditions: TrackCondition[] | undefined;
  flowSession: SDKContentSession | undefined;
  checklistSession: SDKContentSession | undefined;
};

/**
 * Get the external user room
 * @param environmentId - The environment id
 * @param externalUserId - The external user id
 * @returns The external user room
 */
export const getExternalUserRoom = (environmentId: string, externalUserId: string) => {
  return `user:${environmentId}:${externalUserId}`;
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
  const trackConditions = client?.data?.trackConditions as TrackCondition[] | undefined;
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

/**
 * Set the content session for the client
 * @param server - The server instance
 * @param client - The client instance
 * @param session - The session to set
 */
export const setContentSession = (server: Server, client: Socket, session: SDKContentSession) => {
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
 * Get the content session for the client
 * @param client - The client instance
 * @param contentType - The content type
 * @returns The content session
 */
export const getContentSession = (
  client: Socket,
  contentType: ContentDataType,
): SDKContentSession | null => {
  if (contentType === ContentDataType.FLOW) {
    return getClientData(client).flowSession;
  }
  if (contentType === ContentDataType.CHECKLIST) {
    return getClientData(client).checklistSession;
  }
  return null;
};

/**
 * Unset the content session for the client
 * @param server - The server instance
 * @param client - The client instance
 * @param contentType - The content type to unset
 * @param sessionId - The ID of the session to unset
 */
export const unsetContentSession = (
  server: Server,
  client: Socket,
  contentType: ContentDataType,
  sessionId: string,
) => {
  const { environment, externalUserId } = getClientData(client);

  const room = getExternalUserRoom(environment.id, externalUserId);
  if (contentType === ContentDataType.FLOW) {
    unsetFlowSession(server, room, sessionId);
  } else if (contentType === ContentDataType.CHECKLIST) {
    unsetChecklistSession(server, room, sessionId);
  }
  unsetSessionData(client, contentType);
};

/**
 * Unset the session data for the client
 * @param client - The client instance
 * @param contentType - The content type to unset
 */
export const unsetSessionData = (client: Socket, contentType: ContentDataType): boolean => {
  if (contentType === ContentDataType.FLOW) {
    setClientData(client, { flowSession: undefined });
  } else if (contentType === ContentDataType.CHECKLIST) {
    setClientData(client, { checklistSession: undefined });
  }
  return true;
};

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
