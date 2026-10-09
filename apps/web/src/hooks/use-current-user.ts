import { type CurrentUser, useCurrentUserId, useGetUserInfoQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { resolveUserInfo } from './resolve-user-info';

// Thin wrapper over the `me` query. The three-state return is decided by
// resolveUserInfo; the query itself runs through the query layer with
// `errorPolicy: 'all'` (see useGetUserInfoQuery).
//
// SHARED_CACHE_QUERY_OPTIONS: AppProvider composes this hook four times
// (direct + via useUserProjects/useActiveProject/useCapabilities).
// Cache participation makes a single AppContext.refetch() propagate to
// every observer of the `me` slice — without it, capabilities/projects
// stayed stale after a transfer-owner refresh because they read from
// separate observables.
//
// refetchWritePolicy 'merge': an explicit refetch() otherwise writes with
// `existing` cleared, which bypasses the `User.projects` keepKnownList
// merge — a refetch that fails only on `projects` would erase the known
// list. 'merge' runs the field merges as on any other write. It is safe
// here because `me` has exactly one merge function and that one replaces
// on a delivered list; it is not a global default because the paginated
// accumulators rely on the overwrite.
export const useCurrentUser = () => {
  const uid = useCurrentUserId();
  const { data, loading, error, refetch } = useGetUserInfoQuery(uid || undefined, {
    ...SHARED_CACHE_QUERY_OPTIONS,
    refetchWritePolicy: 'merge',
  });

  const userInfo = resolveUserInfo<CurrentUser>({ uid, data, loading, error });

  return { userInfo, loading, error, refetch };
};
