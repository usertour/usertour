import { NetworkStatus } from '@apollo/client';
import { useCallback, useEffect, useRef, useState } from 'react';

// Shared shape for accumulator-style cursor-paginated queries in
// @usertour/hooks (`useListContentsQuery`,
// `useListContentVersionsQuery`, the activity-feed wrapper). Each was
// hand-rolling the same three pieces:
//
//   1. `loadingMore = networkStatus === NetworkStatus.fetchMore`
//   2. An idempotency guard around `fetchMore`, one page request per
//      list at a time — Apollo doesn't dedup `fetchMore` against
//      identical variables, so a double-call (a fast sentinel, a reload
//      or a filter switched away and back while the page is in flight)
//      would issue the same `after` cursor, or an overlapping one, and
//      the typePolicy accumulator would receive the rows twice.
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
  /** The page this list would ask for next has failed. Until
   *  `retryNextPage` or a reload, `fetchNextPage` does nothing: a sentinel
   *  still in view would otherwise ask for the same page again and again.
   *  Another list, or another page of this one, is not failed. */
  pageFailed: boolean;
  /** Idempotent against rapid double-invocation while a request is in
   *  flight, and a no-op after a failure. Resolves either way: the
   *  failure is `pageFailed`, and the query layer has already surfaced
   *  it. */
  fetchNextPage: () => Promise<void>;
  /** Clears the failure and asks for the page again — the user's call. */
  retryNextPage: () => Promise<void>;
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

  // A page request is identified by its variables: the list's filter and
  // the cursor, as the server sees them. A failure is kept per request, so
  // a request for a list the user has left does not mark the one they are
  // on. The in-flight guard is kept per list — the variables with the
  // cursor blanked out — so one list has one page request at a time: a
  // reload that moved the cursor while a page was in flight does not get a
  // second, overlapping page, and a list the user has left does not block
  // the one they are on.
  const nextPageKey = endCursor ? JSON.stringify(buildVariables(endCursor)) : null;
  const inFlight = useRef(new Set<string>());
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const pageFailed = nextPageKey !== null && failedKey === nextPageKey;

  // A reload is the user asking for the list afresh; the failure goes with it.
  useEffect(() => {
    if (networkStatus === NetworkStatus.refetch) {
      setFailedKey(null);
    }
  }, [networkStatus]);

  const request = useCallback(async () => {
    if (!hasNextPage || loading || !endCursor) {
      return;
    }
    const variables = buildVariablesRef.current(endCursor);
    const listKey = JSON.stringify({ ...variables, after: undefined });
    if (inFlight.current.has(listKey)) {
      return;
    }
    inFlight.current.add(listKey);
    try {
      await fetchMore({ variables });
    } catch {
      // The query layer has surfaced it; here it only stops the next ask.
      setFailedKey(JSON.stringify(variables));
    } finally {
      inFlight.current.delete(listKey);
    }
  }, [endCursor, fetchMore, hasNextPage, loading]);

  const fetchNextPage = useCallback(
    () => (pageFailed ? Promise.resolve() : request()),
    [pageFailed, request],
  );

  const retryNextPage = useCallback(() => {
    setFailedKey(null);
    return request();
  }, [request]);

  return { loadingMore, pageFailed, fetchNextPage, retryNextPage };
};
