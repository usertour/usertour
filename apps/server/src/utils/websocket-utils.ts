import { ContentDataType } from '@usertour/types';
import { SDKContentSession } from '@/common/types/sdk';
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
  const { lastActivatedFlowSession, lastActivatedChecklistSession } = socketClientData;

  return [
    contentType === ContentDataType.FLOW && lastActivatedFlowSession?.content.id,
    contentType === ContentDataType.CHECKLIST && lastActivatedChecklistSession?.content.id,
  ].filter(Boolean) as string[];
};
