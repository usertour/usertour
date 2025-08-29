import { Environment } from '@/common/types/schema';
import { SDKContentSession, TrackCondition } from '@/common/types/sdk';
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
