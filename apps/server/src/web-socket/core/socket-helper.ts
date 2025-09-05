import { Server, Socket } from 'socket.io';
import { ContentDataType } from '@usertour/types';
import { SDKContentSession, TrackCondition } from '@/common/types/sdk';
import {
  getClientData,
  setClientData,
  getExternalUserRoom,
  setFlowSession,
  setChecklistSession,
  unsetFlowSession,
  unsetChecklistSession,
  trackClientEvent,
  untrackClientEvent,
} from '@/utils/ws-utils';

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

  // Check if condition was found
  const conditionExists = trackConditions.some((c) => c.condition.id === conditionId);
  if (!conditionExists) return false;

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
