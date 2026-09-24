/** Redis lock key serialising session creation for one user × content. */
export const buildSessionCreateLockKey = (
  environmentId: string,
  externalUserId: string,
  contentId: string,
): string => {
  return `session-create:{${environmentId}:${externalUserId}}:${contentId}`;
};
