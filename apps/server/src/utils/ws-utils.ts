import { Environment } from '@/common/types/schema';
import { SDKContentSession, TrackCondition } from '@/common/types/sdk';
import { Socket } from 'socket.io';

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
