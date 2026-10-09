/**
 * Folds the Apollo `me` query state into the three-state `userInfo`:
 *   undefined → still loading the first response
 *   null      → confirmed no user (no session id, or the query answered
 *               without a user)
 *   T         → loaded
 *
 * Data wins over error. With the app-wide `errorPolicy: 'all'`, a failing
 * field (such as `me.projects`) arrives as partial data plus an error, and
 * the user it came with is still signed in. Under `cache-and-network` a
 * failed refetch of the whole query also still carries the cached user, so
 * a mid-session failure keeps the session as well: a failure is never a
 * sign-out. Signing out on an expired session is the error link's job
 * (E0011 → token refresh or a hard redirect), not this function's. Only a
 * response with no user at all means no user. During a refetch Apollo keeps
 * the previous data, so callers never see the in-between flicker.
 */
export const resolveUserInfo = <T>(state: {
  uid: string | null | undefined;
  data: T | null | undefined;
  loading: boolean;
  error: unknown;
}): T | null | undefined => {
  if (!state.uid) {
    return null;
  }
  if (state.data) {
    return state.data;
  }
  if (state.loading) {
    return undefined;
  }
  return null;
};
