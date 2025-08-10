export const getExternalUserRoom = (environmentId: string, externalUserId: string) => {
  return `user:${environmentId}:${externalUserId}`;
};
