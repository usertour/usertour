import { useApolloClient } from '@apollo/client';
import { getUserInfo } from '@usertour/gql';

/**
 * Force-refresh the `me` query after a 2FA state change. Evicts the
 * cached entry and re-runs any active `me` subscriptions so guards that
 * derive from `userInfo.twoFactorEnabled` see the new value immediately.
 */
export const useRefreshMe = () => {
  const apollo = useApolloClient();
  return async () => {
    apollo.cache.evict({ fieldName: 'me' });
    apollo.cache.gc();
    await apollo.refetchQueries({ include: [getUserInfo] }).catch(() => undefined);
  };
};
