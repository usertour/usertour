import { ContentDataType } from '@usertour/types';
import {
  CustomContentSession,
  TrackCondition,
  ClientCondition,
  ConditionWaitTimer,
} from '@/common/types/sdk';
import { SocketClientData } from '@/common/types/content';

/**
 * WebSocket utility functions
 * Contains pure functions for WebSocket-related operations
 */

/**
 * Build the socket lock key for distributed locking
 * Uses hash tag to ensure cluster compatibility
 * @param socketId - The socket ID
 * @returns The socket lock key
 */
export const buildSocketLockKey = (socketId: string): string => {
  return `{${socketId}}:socket_lock`;
};

/**
 * Build the external user room ID
 * @param environmentId - The environment id
 * @param externalUserId - The external user id
 * @returns The external user room ID
 */
export const buildExternalUserRoomId = (environmentId: string, externalUserId: string): string => {
  return `user:${environmentId}:${externalUserId}`;
};

/**
 * Extract content session from socket client data by content type
 * @param socketClientData - The socket client data
 * @param contentType - The content type
 * @returns The content session or null
 */
export const extractSessionByContentType = (
  socketClientData: SocketClientData,
  contentType: ContentDataType,
): CustomContentSession | null => {
  const { flowSession, checklistSession } = socketClientData;
  switch (contentType) {
    case ContentDataType.FLOW:
      return flowSession ?? null;
    case ContentDataType.CHECKLIST:
      return checklistSession ?? null;
    default:
      return null;
  }
};

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
 * @param cleanupContentTypes - Optional array of content types to cleanup for
 * @returns Object containing filtered and preserved conditions (always returns arrays, never undefined)
 */
export const filterAndPreserveConditions = (
  clientConditions: ClientCondition[],
  cleanupContentTypes?: ContentDataType[],
): {
  filteredConditions: ClientCondition[];
  preservedConditions: ClientCondition[];
} => {
  const filteredConditions = cleanupContentTypes
    ? clientConditions.filter((c) => cleanupContentTypes.includes(c.contentType))
    : clientConditions;

  const preservedConditions = cleanupContentTypes
    ? clientConditions.filter((c) => !cleanupContentTypes.includes(c.contentType))
    : [];

  return {
    filteredConditions,
    preservedConditions,
  };
};

/**
 * Filter and preserve condition wait timers based on content type filter
 * @param waitTimers - All condition wait timers
 * @param cleanupContentTypes - Optional array of content types to cleanup for
 * @returns Object containing filtered and preserved wait timers (always returns arrays, never undefined)
 */
export const filterAndPreserveWaitTimers = (
  waitTimers: ConditionWaitTimer[],
  cleanupContentTypes?: ContentDataType[],
): {
  filteredWaitTimers: ConditionWaitTimer[];
  preservedWaitTimers: ConditionWaitTimer[];
} => {
  const filteredWaitTimers = cleanupContentTypes
    ? waitTimers.filter((t) => cleanupContentTypes.includes(t.contentType))
    : waitTimers;

  const preservedWaitTimers = cleanupContentTypes
    ? waitTimers.filter((t) => !cleanupContentTypes.includes(t.contentType))
    : [];

  return {
    filteredWaitTimers,
    preservedWaitTimers,
  };
};

/**
 * Convert TrackCondition array to ClientCondition array
 * @param trackConditions - Array of track conditions to convert
 * @returns Array of client conditions
 */
export const convertToClientConditions = (trackConditions: TrackCondition[]): ClientCondition[] => {
  return trackConditions.map((trackCondition) => ({
    contentId: trackCondition.contentId,
    contentType: trackCondition.contentType,
    versionId: trackCondition.versionId,
    conditionId: trackCondition.condition.id,
    isActive: false, // Default to inactive state
  }));
};
