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
