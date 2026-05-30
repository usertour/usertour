import { NetworkStatus } from '@apollo/client';
import { useCallback, useRef } from 'react';

// Shared shape for accumulator-style cursor-paginated queries in
// @usertour/hooks (`useListContentsQuery`,
// `useListContentVersionsQuery`, the activity-feed wrapper). Each was
// hand-rolling the same three pieces:
//
//   1. `loadingMore = networkStatus === NetworkStatus.fetchMore`
//   2. A `fetchingRef` belt-and-braces idempotency guard around
//      `fetchMore` — Apollo doesn't dedup `fetchMore` against
//      identical variables, so a fast double-call would issue the
//      same `after` cursor and the typePolicy accumulator would
//      receive the page twice.
//   3. A `hasNextPage && !loading && endCursor` short-circuit.
//
// The merge itself stays at the cache layer (typePolicy
// `accumulatorMerge` — see `docs/conventions/list-pagination.md`); this
// hook is the request-side companion.

export interface UseCursorFetchMoreArgs {
  /** Apollo's `loading` flag — used by the short-circuit, NOT the
   *  loadingMore derivation (Apollo flips `loading` during fetchMore
   *  too; we use `networkStatus` to distinguish). */
  loading: boolean;
  /** Apollo's network status — `NetworkStatus.fetchMore` (3) is what
   *  surfaces as `loadingMore`. */
  networkStatus: NetworkStatus;
  /** Whether another page exists server-side. */
  hasNextPage: boolean;
  /** Cursor for the next page. `null` short-circuits the fetch. */
  endCursor: string | null;
  /** Apollo's `fetchMore` from the source `useQuery`. */
  fetchMore: (options: { variables: Record<string, unknown> }) => Promise<unknown>;
  /** Returns the variables for the next-page request. The hook passes
   *  the just-dereffed `endCursor` as `after`; the caller composes
   *  its other variables (page size, filter, orderBy) around it. */
  buildVariables: (after: string) => Record<string, unknown>;
}

export interface UseCursorFetchMoreResult {
  /** True iff Apollo is in `NetworkStatus.fetchMore`. Exposed
   *  alongside `loading` so consumers can keep the already-rendered
   *  list intact while a page is appending. */
  loadingMore: boolean;
  /** Idempotent against rapid double-invocation while a request is in
   *  flight. */
  fetchNextPage: () => Promise<void>;
}

export const useCursorFetchMore = (args: UseCursorFetchMoreArgs): UseCursorFetchMoreResult => {
  const { loading, networkStatus, hasNextPage, endCursor, fetchMore, buildVariables } = args;

  const loadingMore = networkStatus === NetworkStatus.fetchMore;

  // Stash latest `buildVariables` in a ref so the callback identity
  // stays stable across renders where only the closure changes.
  // Consumers like `react-infinite-scroll-hook` re-read `onLoadMore`
  // on every render so stability isn't load-bearing, but it avoids
  // unnecessary effect re-runs if a caller ever depends on the
  // callback identity directly.
  const buildVariablesRef = useRef(buildVariables);
  buildVariablesRef.current = buildVariables;

  // Idempotency guard. See file header — Apollo's `fetchMore` is not
  // deduped against identical variables, so this is the safety net
  // when a UI trigger (button / sentinel) fires twice before the
  // first response lands.
  const fetchingRef = useRef(false);

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || loading || fetchingRef.current || !endCursor) {
      return;
    }
    fetchingRef.current = true;
    try {
      await fetchMore({ variables: buildVariablesRef.current(endCursor) });
    } finally {
      fetchingRef.current = false;
    }
  }, [endCursor, fetchMore, hasNextPage, loading]);

  return { loadingMore, fetchNextPage };
};
