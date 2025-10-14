import { ContentDataType } from '@usertour/types';
import {
  CustomContentSession,
  TrackCondition,
  ClientCondition,
  ConditionWaitTimer,
} from '@/common/types/sdk';
import { SocketClientData } from '@/common/types/content';
import { Socket } from 'socket.io';

/**
 * Helper functions for managing socket client data
 * Data is stored directly on the socket object for maximum performance
 * and automatic cleanup when socket disconnects
 */

const DATA_KEY = 'clientData';

/**
 * Set client data on socket
 * @param socket - The socket instance
 * @param clientData - The client data to store
 */
export const setSocketClientData = (socket: Socket, clientData: SocketClientData): void => {
  socket.data[DATA_KEY] = clientData;
};

/**
 * Get client data from socket
 * @param socket - The socket instance
 * @returns The client data or null if not found
 */
export const getSocketClientData = (socket: Socket): SocketClientData | null => {
  return socket.data[DATA_KEY] || null;
};

/**
 * Update client data on socket
 * @param socket - The socket instance
 * @param updates - Partial updates to apply
 * @returns true if update succeeded, false if no existing data
 */
export const updateSocketClientData = (
  socket: Socket,
  updates: Partial<SocketClientData>,
): boolean => {
  const existing = getSocketClientData(socket);

  if (!existing) {
    return false;
  }

  socket.data[DATA_KEY] = { ...existing, ...updates };
  return true;
};

/**
 * WebSocket utility functions
 * Contains pure functions for WebSocket-related operations
 */

/**
 * Build the external user room ID
 * @param environmentId - The environment id
 * @param externalUserId - The external user id
 * @returns The external user room ID
 */
export function buildExternalUserRoomId(environmentId: string, externalUserId: string): string {
  return `user:${environmentId}:${externalUserId}`;
}

/**
 * Extract content session from socket client data by content type
 * @param socketClientData - The socket client data
 * @param contentType - The content type
 * @returns The content session or null
 */
export function extractSessionByContentType(
  socketClientData: SocketClientData,
  contentType: ContentDataType,
): CustomContentSession | null {
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
 * Extract content type by session id
 * @param socketClientData - The socket client data
 * @param sessionId - The session id
 * @returns The content type or null
 */
export const extractContentTypeBySessionId = (
  socketClientData: SocketClientData,
  sessionId: string,
): ContentDataType | null => {
  const { flowSession, checklistSession } = socketClientData;
  if (flowSession?.id === sessionId) {
    return ContentDataType.FLOW;
  }
  if (checklistSession?.id === sessionId) {
    return ContentDataType.CHECKLIST;
  }
  return null;
};

/**
 * Extract excluded content IDs based on current content type and client data
 * Only excludes the same content type to avoid conflicts between different content types
 * @param socketClientData - The socket client data
 * @param contentType - The current content type
 * @returns Array of content IDs to exclude
 */
export const extractExcludedContentIds = (
  socketClientData: SocketClientData,
  contentType: ContentDataType,
): string[] => {
  const { lastDismissedFlowId, lastDismissedChecklistId } = socketClientData;

  return [
    contentType === ContentDataType.FLOW && lastDismissedFlowId,
    contentType === ContentDataType.CHECKLIST && lastDismissedChecklistId,
  ].filter(Boolean) as string[];
};

/**
 * Categorize client conditions into preserved, untrack, and track groups
 * @param clientConditions - Current client conditions
 * @param trackConditions - New conditions to track
 * @returns Object with categorized conditions
 */
export const categorizeClientConditions = (
  clientConditions: ClientCondition[] | undefined,
  trackConditions: TrackCondition[] | undefined,
) => {
  const trackIds = new Set(trackConditions?.map((c) => c.condition.id) ?? []);
  const clientIds = new Set(clientConditions?.map((c) => c.conditionId) ?? []);

  return {
    preservedConditions: clientConditions?.filter((c) => trackIds.has(c.conditionId)) ?? [],
    conditionsToUntrack: clientConditions?.filter((c) => !trackIds.has(c.conditionId)) ?? [],
    conditionsToTrack: trackConditions?.filter((c) => !clientIds.has(c.condition.id)) ?? [],
  };
};

/**
 * Calculate remaining client conditions by filtering out successfully processed ones
 * @param originalConditions - The original array of client conditions
 * @param processedConditions - Array of client conditions that were successfully processed
 * @returns Array of client conditions that were not successfully processed
 */
export const calculateRemainingClientConditions = (
  originalConditions: ClientCondition[],
  processedConditions: ClientCondition[],
): ClientCondition[] => {
  return originalConditions.filter(
    (condition) =>
      !processedConditions.some((processed) => processed.conditionId === condition.conditionId),
  );
};

/**
 * Calculate remaining condition wait timers by filtering out successfully processed ones
 * @param originalTimers - The original array of condition wait timers
 * @param processedTimers - Array of condition wait timers that were successfully processed
 * @returns Array of condition wait timers that were not successfully processed
 */
export const calculateRemainingConditionWaitTimers = (
  originalTimers: ConditionWaitTimer[],
  processedTimers: ConditionWaitTimer[],
): ConditionWaitTimer[] => {
  return originalTimers.filter(
    (timer) => !processedTimers.some((processed) => processed.versionId === timer.versionId),
  );
};

/**
 * Filter and preserve client conditions based on content type filter
 * @param clientConditions - All client conditions
 * @param contentTypeFilter - Optional array of content types to filter by
 * @returns Object containing filtered and preserved conditions (always returns arrays, never undefined)
 */
export const filterAndPreserveConditions = (
  clientConditions: ClientCondition[],
  contentTypeFilter?: ContentDataType[],
): {
  filteredConditions: ClientCondition[];
  preservedConditions: ClientCondition[];
} => {
  const filteredConditions = contentTypeFilter
    ? clientConditions.filter((c) => contentTypeFilter.includes(c.contentType))
    : clientConditions;

  const preservedConditions = contentTypeFilter
    ? clientConditions.filter((c) => !contentTypeFilter.includes(c.contentType))
    : [];

  return {
    filteredConditions,
    preservedConditions,
  };
};
