import { useApolloClient } from '@apollo/client';
import { useLogoutMutation } from '@usertour/hooks';
import { removeAuthToken } from '@usertour/helpers';
import { useCallback } from 'react';
import { broadcastAuthSwitch } from '@/utils/auth-channel';

// Logout primitives — both flavors:
//   handleLogout      — stays in the SPA, evicts the `me` cache so
//                       AuthGuard's <Navigate /> fires immediately.
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
