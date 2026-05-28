import { useCurrentUserId, useGetUserInfoQuery } from '@usertour/hooks';
import type { UserProfile } from '@usertour/types';

// Thin wrapper over the Apollo `me` query. Three-state return preserves
// the legacy AppContext contract:
//   undefined → still loading the first response
//   null      → confirmed no user (skipped query / error / data missing)
//   UserProfile → loaded
//
// During a refetch Apollo keeps the previous `data`, so callers don't
// see the in-between flicker.
export const useCurrentUser = () => {
  const uid = useCurrentUserId();
  const { data, loading, error, refetch } = useGetUserInfoQuery(uid || undefined);

  const userInfo: UserProfile | null | undefined =
    loading && !data ? undefined : !uid || error || !data ? null : (data as UserProfile);

  return { userInfo, loading, error, refetch };
};
