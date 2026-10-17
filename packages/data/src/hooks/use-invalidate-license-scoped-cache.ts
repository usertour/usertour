import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';
import { GlobalConfigDocument, MeDocument } from '../graphql';

/**
 * Returns a function that invalidates the two cached queries whose results
 * depend on instance/project-level admin state — `me` (per-user
 * `twoFactorAvailable`) and `globalConfig` (instance-wide `require2FA`).
 * Call after any admin mutation that changes a license token or instance
 * setting which surfaces back to end users, so already-mounted pages
 * (route guard, /settings/account) don't keep stale gating state until a
 * manual reload.
 */
export const useInvalidateLicenseScopedCache = () => {
  const apollo = useApolloClient();
  return useCallback(async () => {
    apollo.cache.evict({ fieldName: 'me' });
    apollo.cache.evict({ fieldName: 'globalConfig' });
    apollo.cache.gc();
    await apollo
      .refetchQueries({ include: [MeDocument, GlobalConfigDocument] })
      .catch(() => undefined);
  }, [apollo]);
};
