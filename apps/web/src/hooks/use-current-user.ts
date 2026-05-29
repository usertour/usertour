import { useCurrentUserId, useGetUserInfoQuery } from '@usertour/hooks';
import type { UserProfile } from '@usertour/types';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

// Thin wrapper over the Apollo `me` query. Three-state return preserves
// the legacy AppContext contract:
//   undefined → still loading the first response
//   null      → confirmed no user (skipped query / error / data missing)
//   UserProfile → loaded
//
// During a refetch Apollo keeps the previous `data`, so callers don't
// see the in-between flicker.
//
// SHARED_CACHE_QUERY_OPTIONS: AppProvider composes this hook four times
// (direct + via useUserProjects/useActiveProject/useCapabilities).
// Cache participation makes a single AppContext.refetch() propagate to
// every observer of the `me` slice — without it, capabilities/projects
// stayed stale after a transfer-owner refresh because they read from
// separate observables.
export const useCurrentUser = () => {
  const uid = useCurrentUserId();
  const { data, loading, error, refetch } = useGetUserInfoQuery(
    uid || undefined,
    SHARED_CACHE_QUERY_OPTIONS,
  );

  const userInfo: UserProfile | null | undefined =
    loading && !data ? undefined : !uid || error || !data ? null : (data as UserProfile);

  return { userInfo, loading, error, refetch };
};
