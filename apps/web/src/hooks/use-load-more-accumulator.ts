import type { PageInfo } from '@usertour/types';
import { useCallback, useEffect, useRef, useState } from 'react';

// Append-on-cursor-advance accumulation, paired with an Apollo wrapper
// that returns one page at a time. Caller owns `afterCursor` state (it
// has to feed it into the wrapper's pagination input), the hook owns
// the accumulator buffer + the in-flight-more flag.
//
// Distinct from `useBizListCursor` — that engine drives a TanStack
// Table's page-replace semantics; this one accumulates rows for a
// "load more" button (sessions, company memberships, etc.).
//
// All args are flat primitives / stable references on purpose: the
// earlier `{ page, cursor }` grouping caused effect-dep churn (the
// object literal was a new ref each render) which wiped the
// accumulator on every render. Don't re-introduce that shape.

export interface LoadMoreAccumulatorArgs<T> {
  /** Current page from the wrapper (items, pageInfo, totalCount, loading, refetch). */
  pageItems: T[];
  pageInfo: PageInfo | undefined;
  pageTotalCount: number;
  pageLoading: boolean;
  pageRefetch: () => Promise<unknown>;
  /** Cursor state — value drives the wrapper, setter advances on `loadMore`. */
  afterCursor: string | undefined;
  setAfterCursor: (cursor: string | undefined) => void;
  /** Wipe the accumulator when this changes (e.g. switching users). */
  resetKey: string;
  /** Unique id extractor for de-dup when appending. */
  getId: (item: T) => string;
}

export interface LoadMoreAccumulatorResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  /** Wrapper loading OR an in-flight loadMore. */
  loading: boolean;
  loadMore: () => void;
  /** Reset accumulator + force-refetch (covers the cursor-already-undefined case). */
  refresh: () => void;
}

export function useLoadMoreAccumulator<T>(
  args: LoadMoreAccumulatorArgs<T>,
): LoadMoreAccumulatorResult<T> {
  const {
    pageItems,
    pageInfo,
    pageTotalCount,
    pageLoading,
    pageRefetch,
    afterCursor,
    setAfterCursor,
    resetKey,
    getId,
  } = args;

  const [items, setItems] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [latestPageInfo, setLatestPageInfo] = useState<PageInfo | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Stash `getId` in a ref — callers typically pass an inline arrow
  // (e.g. `(s) => s.id`), which means a new function reference each
  // render. We don't want that to drive effect deps; we just call the
  // latest version when accumulating.
  const getIdRef = useRef(getId);
  getIdRef.current = getId;

  const reset = useCallback(() => {
    setItems([]);
    setTotalCount(0);
    setLatestPageInfo(null);
    setIsLoadingMore(false);
    setAfterCursor(undefined);
  }, [setAfterCursor]);

  // Trigger off `pageInfo` (= Apollo's stable cached reference for the
  // current query result), NOT `pageItems` — the list wrapper builds a
  // fresh `.map()` array every render even when underlying data is
  // unchanged, so a `pageItems` dep would re-fire and overwrite the
  // accumulator on every render. `pageItems` / `pageTotalCount` are
  // read via closure inside.
  useEffect(() => {
    if (!pageInfo) return;
    setLatestPageInfo(pageInfo);
    setItems((prev) => {
      if (!afterCursor) return pageItems;
      const seen = new Set(prev.map(getIdRef.current));
      return [...prev, ...pageItems.filter((item) => !seen.has(getIdRef.current(item)))];
    });
    setTotalCount(pageTotalCount);
    setIsLoadingMore(false);
  }, [pageInfo, afterCursor]);

  // Wipe on context change (e.g. user route param flips). `reset` is
  // stable via useCallback above.
  useEffect(() => {
    reset();
  }, [resetKey, reset]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && latestPageInfo?.hasNextPage) {
      setIsLoadingMore(true);
      setAfterCursor(latestPageInfo.endCursor);
    }
  }, [isLoadingMore, latestPageInfo, setAfterCursor]);

  const refresh = useCallback(() => {
    // If we're past page 1, resetting afterCursor → undefined changes
    // the wrapper's variables, which makes Apollo's useQuery
    // auto-refetch with the correct first-page variables. An explicit
    // `pageRefetch()` here would fire BEFORE the state update applies
    // — Apollo's observable still holds the old cursor, so we'd waste
    // a request on the stale page and momentarily paint it before the
    // real first page lands.
    // If we're already on page 1, no variables change → no
    // auto-refetch, so the explicit refetch is required to force
    // network.
    const wasPastFirstPage = !!afterCursor;
    reset();
    if (!wasPastFirstPage) {
      pageRefetch();
    }
  }, [afterCursor, reset, pageRefetch]);

  return {
    items,
    totalCount,
    hasMore: items.length < totalCount,
    loading: pageLoading || isLoadingMore,
    loadMore,
    refresh,
  };
}
