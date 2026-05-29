import type { QueryHookOptions } from '@apollo/client';

/**
 * Opt-in fetchPolicy for queries that should participate in the
 * normalized cache — list pages whose row mutations broadcast through
 * `update(cache)` callbacks, plus the facade hooks that compose the
 * same query in multiple places.
 *
 * The app-wide Apollo default is `no-cache` (see ./index.ts), which
 * isolates each ObservableQuery: responses go straight to its own
 * local state, never through InMemoryCache. To benefit from mutation
 * update callbacks broadcasting across the tree, a query must opt in
 * to cache participation.
 *
 * `cache-and-network` is the chosen value:
 * - paints from cache immediately (no blank flash on revisit)
 * - fires network in parallel so the cache stays fresh against changes
 *   made by other members of the same project (multi-admin teams)
 * - mutation `update(cache)` / `refetchQueries` still broadcast through
 *   the same cache slice as they would under cache-first
 *
 * Cost: every mount of a consuming query fires one network request.
 * Settings list pages and facade composition both have low mount
 * frequency, so this is acceptable. The previous default was
 * `cache-first`, which avoided the per-mount request but left team
 * members invisible to each other's edits until an explicit refetch
 * — that staleness is not acceptable in a multi-member workspace.
 *
 * Usage:
 *
 *   useListEventsQuery(projectId, SHARED_CACHE_QUERY_OPTIONS);
 *
 *   useListAttributesQuery(projectId, bizType, {
 *     ...SHARED_CACHE_QUERY_OPTIONS,
 *     skip: !projectId,
 *   });
 *
 * To unwind (e.g. if the app-wide default ever becomes cache-friendly):
 * grep for `SHARED_CACHE_QUERY_OPTIONS`, drop every usage, then delete
 * this file.
 */
export const SHARED_CACHE_QUERY_OPTIONS: QueryHookOptions = {
  fetchPolicy: 'cache-and-network',
};
