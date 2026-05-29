import { useApolloClient } from '@apollo/client';
import { UID_COOKIE } from '@usertour/constants';
import { useLogoutMutation } from '@usertour/hooks';
import { removeAuthToken } from '@usertour/helpers';
import { useCallback } from 'react';
import { broadcastAuthSwitch } from '@/utils/auth-channel';

// Clears the UID cookie that `useCurrentUserId` reads — without this
// the cookie persists past sign-out and `useGetUserInfoQuery` keeps
// firing with the old uid.
const clearAuthCookies = () => {
  document.cookie = `${UID_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

// Logout primitives — both flavors:
//   handleLogout      — stays in the SPA. Clears the UID cookie so
//                       useCurrentUserId returns null, then evicts the
//                       `me` slice so observers subscribed via
//                       SHARED_CACHE_QUERY_OPTIONS see `data: undefined`
//                       and the userInfo three-state derives to null.
//                       AuthGuard's <Navigate /> then fires.
//   signOutAndRedirect — full page reload to `to`; deliberately does
//                       NOT evict in-process because the reload blows
//                       the cache away anyway, and in-place eviction
//                       would trigger AuthGuard to flash a Navigate
//                       before the reload lands.
export const useLogout = () => {
  const apollo = useApolloClient();
  const { invoke: logoutMutation } = useLogoutMutation();

  const handleLogout = useCallback(async () => {
    try {
      await logoutMutation();
      removeAuthToken();
      clearAuthCookies();
      apollo.cache.evict({ fieldName: 'me' });
      apollo.cache.gc();
      broadcastAuthSwitch();
    } catch (error) {
      console.error('Logout failed', error);
    }
  }, [logoutMutation, apollo]);

  const signOutAndRedirect = useCallback(
    async (to = '/auth/signin') => {
      try {
        await logoutMutation();
        removeAuthToken();
        clearAuthCookies();
        broadcastAuthSwitch();
      } catch (error) {
        console.error('Logout failed', error);
      }
      window.location.assign(to);
    },
    [logoutMutation],
  );

  return { handleLogout, signOutAndRedirect };
};
