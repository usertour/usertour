import { useApolloClient } from '@apollo/client';
import { getUserInfo } from '@usertour/gql';

/**
 * Force-refresh the `me` query after a 2FA state change so guards that
 * derive from `userInfo.twoFactorEnabled` pick up the new value (callers
 * await this, so the cache is current by the time they continue).
 *
 * Refetch only — deliberately NOT `cache.evict`. Evicting drops the whole
 * `me` entry to undefined for the duration of the refetch, which unmounts
 * the sibling account profile/email forms on this page (they gate on
 * `!userInfo`) and discards any unsaved input. A cache-and-network refetch
 * updates `twoFactorEnabled` just the same while keeping `userInfo` populated.
 */
export const useRefreshMe = () => {
  const apollo = useApolloClient();
  return async () => {
    await apollo.refetchQueries({ include: [getUserInfo] }).catch(() => undefined);
  };
};
