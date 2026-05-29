import type { QueryHookOptions } from '@apollo/client';

/**
 * Opt-in fetchPolicy for queries that have multiple useQuery consumers
 * in the same page tree and rely on `refetch()` propagation between
 * them — e.g. a list view next to row-action dialogs that each call
 * the same `useXxxQuery` wrapper.
 *
 * The app-wide Apollo default is `no-cache` (see ./index.ts), which
 * isolates each ObservableQuery: responses go straight to its own
 * local state, never through InMemoryCache. Two consumers with the
 * same query+variables behave like two independent fetches —
 * `refetch()` on one updates only itself.
 *
 * `cache-first` writes responses through the cache, so subscribers
 * with matching query+variables share the same cache slice. The first
 * observer fires one network request; subsequent observers read from
 * cache without firing additional requests. A `refetch()` from any
 * observer hits the network, writes the cache, and broadcasts to every
 * subscriber.
 *
 * Tradeoff: revisits read cached data first (no automatic background
 * refresh). For data that mutates only via user actions on the same
 * page (settings lists, etc.) this is fine — those mutations trigger
 * explicit refetches. For data that changes externally (cross-tab,
 * cross-device), opt that specific call site into `cache-and-network`
 * instead.
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
  fetchPolicy: 'cache-first',
};
