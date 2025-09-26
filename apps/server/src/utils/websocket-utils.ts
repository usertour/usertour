import { ContentDataType } from '@usertour/types';
import {
  SDKContentSession,
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
): SDKContentSession | null {
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
 * @param trackHideConditions - New conditions to track
 * @returns Object with categorized conditions
 */
export const categorizeClientConditions = (
  clientConditions: ClientCondition[] | undefined,
  trackHideConditions: TrackCondition[] | undefined,
) => {
  const trackHideIds = new Set(trackHideConditions?.map((c) => c.condition.id) ?? []);
  const clientIds = new Set(clientConditions?.map((c) => c.conditionId) ?? []);

  return {
    preservedConditions: clientConditions?.filter((c) => trackHideIds.has(c.conditionId)) ?? [],
    conditionsToUntrack: clientConditions?.filter((c) => !trackHideIds.has(c.conditionId)) ?? [],
    conditionsToTrack: trackHideConditions?.filter((c) => !clientIds.has(c.condition.id)) ?? [],
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
