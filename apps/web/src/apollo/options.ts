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
 * `cache-and-network` writes responses through the cache, so the
 * broadcast notifies every observer of the same cache slice. The
 * tradeoff is one extra network request per mount of each consumer.
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
