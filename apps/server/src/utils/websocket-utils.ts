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
