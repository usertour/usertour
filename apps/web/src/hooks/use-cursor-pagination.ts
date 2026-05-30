import { NetworkStatus } from '@apollo/client';
import type { QueryHookOptions } from '@apollo/client';
import type { PaginationState } from '@tanstack/react-table';
import type { PageInfo, Pagination } from '@usertour/types';
import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';

// Unified primitive for table-style cursor pagination across the
// admin app — replaces `useBizListCursor` and `useBizSessions`,
// which were two separate copies of the same engine and shared the
// same three bug classes:
//
//   1. Caller-managed `pagination` state required the caller to
//      remember to reset `pageIndex` whenever the query shape
//      changed (date range, content id, …). One forgotten useEffect
//      meant a stale-cursor request flew out before the reset took
//      effect, producing duplicate / empty pages.
//   2. `pageCount` was derived from a `currentPagination` ref that
//      lagged behind the real `pageSize`. Changing page size while
//      sitting on the last page miscomputed the "last" branch.
//   3. The state was synced through a chain of useEffects with
//      `currentPagination` in its own deps; the cycle worked but
//      tripped React 18 StrictMode dev double-runs and was an
//      acknowledged pattern smell.
//
// This hook fixes all three by:
//
//   - Owning `pagination` state internally and exposing it back as
//     `{ pagination, setPagination }` for TanStack Table binding,
//     so a caller can't forget to reset it.
//   - Watching the query identity via a `useRef` compared during
//     render — when it changes we synchronously reset pagination
//     and clear the committed cursor in the same render cycle, so
//     the useQuery call below picks up the reset cursor with the
//     new query variables and dispatches ONE request, not two.
//   - Deriving `requestPagination` via `useMemo` from the current
//     pagination + last committed pageInfo. Effects only commit
//     fresh pageInfo / totalCount; no derived-state cycle.
//
// Per-entity Apollo wrappers (e.g. `useQueryBizSessionsQuery`) are
// injected via the `useListQuery` arg, same shape as the old
// `useBizListCursor` accepted; that keeps the data layer ownership
// in @usertour/hooks per ADR 0002 and lets the table treat each
// entity's response uniformly.

export interface OrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface UseListQueryArgs<TQuery> {
  query: TQuery;
  pagination: Pagination;
  orderBy?: OrderBy;
  options?: QueryHookOptions;
}

export interface UseListQueryResult<TRow> {
  contents: TRow[];
  pageInfo: PageInfo | undefined;
  totalCount: number;
  loading: boolean;
  refetch: () => Promise<unknown>;
  networkStatus: NetworkStatus;
}

/** Canonical shape for an entity-specific Apollo wrapper that
 *  `useCursorPagination` can drive. Each entity (user / company /
 *  session / ...) exposes one of these, returning a list of rows
 *  alongside the relay-style `pageInfo` / `totalCount`. */
export type CursorListQueryFn<TRow, TQuery = { environmentId: string; [key: string]: unknown }> = (
  args: UseListQueryArgs<TQuery>,
) => UseListQueryResult<TRow>;

export interface UseCursorPaginationArgs<TRow, TQuery> {
  query: TQuery;
  orderBy?: OrderBy;
  /** Default page size for the initial pagination state. */
  defaultPageSize?: number;
  /** Per-entity Apollo wrapper from @usertour/hooks. */
  useListQuery: (args: UseListQueryArgs<TQuery>) => UseListQueryResult<TRow>;
  /** Skip the underlying query (e.g. context not ready). */
  skip?: boolean;
  /** Extra Apollo options forwarded to the wrapper — typically
   *  `SHARED_CACHE_QUERY_OPTIONS` when the consumer wants the query
   *  to participate in the normalized cache. Merged into the
   *  internal `{ skip, notifyOnNetworkStatusChange: true }` defaults. */
  options?: QueryHookOptions;
}

export interface UseCursorPaginationResult<TRow> {
  rows: TRow[];
  totalCount: number;
  pageCount: number;
  pagination: PaginationState;
  setPagination: Dispatch<SetStateAction<PaginationState>>;
  loading: boolean;
  isRefetching: boolean;
  refetch: () => Promise<unknown>;
}

const DEFAULT_PAGE_SIZE = 20;

export function useCursorPagination<TRow, TQuery>(
  args: UseCursorPaginationArgs<TRow, TQuery>,
): UseCursorPaginationResult<TRow> {
  const { query, orderBy, defaultPageSize = DEFAULT_PAGE_SIZE, useListQuery, skip, options } = args;

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  // Latest pageInfo committed alongside a successful response — only
  // updated by the effect below when `useListQuery` actually returns
  // fresh data, so a mid-flight loading state can't burn the cursor.
  const [committedPageInfo, setCommittedPageInfo] = useState<PageInfo | undefined>();
  const [committedPageIndex, setCommittedPageIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Detect query identity changes during render. React's documented
  // pattern for "adjust some state when a prop changes" —
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  //
  // The setState calls below queue updates that React applies before
  // committing the current render, so the useQuery call further down
  // sees the reset cursor in the SAME render cycle — no first-frame
  // stale request escapes.
  const queryKey = useMemo(() => JSON.stringify({ query, orderBy }), [query, orderBy]);
  const prevQueryKeyRef = useRef(queryKey);
  if (prevQueryKeyRef.current !== queryKey) {
    prevQueryKeyRef.current = queryKey;
    setPagination((prev) => ({ pageIndex: 0, pageSize: prev.pageSize }));
    setCommittedPageInfo(undefined);
    setCommittedPageIndex(0);
    setTotalCount(0);
  }

  // Translate the user-facing pagination state into the relay-style
  // cursor args the GraphQL layer expects. Pure derivation — no
  // useEffect, no setState cascade. `pageCount` is derived from the
  // LIVE `pagination.pageSize`, fixing the "last page + change page
  // size" miscount the old hooks had.
  const requestPagination = useMemo<Pagination>(() => {
    const { pageIndex, pageSize } = pagination;
    if (pageIndex === 0) {
      return { first: pageSize };
    }
    const liveCount = Math.ceil(totalCount / pageSize);
    if (liveCount > 0 && pageIndex + 1 === liveCount) {
      const lastSize = totalCount - (liveCount - 1) * pageSize;
      return { last: lastSize > 0 ? lastSize : pageSize };
    }
    if (committedPageInfo && pageIndex > committedPageIndex) {
      return { first: pageSize, after: committedPageInfo.endCursor };
    }
    if (committedPageInfo && pageIndex < committedPageIndex) {
      return { last: pageSize, before: committedPageInfo.startCursor };
    }
    return { first: pageSize };
  }, [pagination, totalCount, committedPageInfo, committedPageIndex]);

  const {
    contents,
    pageInfo,
    totalCount: tc,
    loading,
    refetch,
    networkStatus,
  } = useListQuery({
    query,
    orderBy,
    pagination: requestPagination,
    options: { ...options, skip, notifyOnNetworkStatusChange: true },
  });

  // Commit cursor + total when Apollo lands a successful page. Effect
  // deps are the response's identity-stable fields — Apollo emits a
  // new `pageInfo` reference per fresh result, so this fires once
  // per response, not per render. No cycle: this effect doesn't
  // touch any state in the `requestPagination` deps unless the
  // response genuinely changed, and even then the new committed
  // state can only re-render once before the deps settle.
  useEffect(() => {
    if (!pageInfo) {
      return;
    }
    setCommittedPageInfo(pageInfo);
    setCommittedPageIndex(pagination.pageIndex);
    setTotalCount(tc);
    // We deliberately do NOT include `pagination.pageIndex` in deps
    // — it shouldn't drive a commit on its own; only a fresh
    // response should.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageInfo, tc]);

  const pageCount = pagination.pageSize > 0 ? Math.ceil(totalCount / pagination.pageSize) : 0;
  const isRefetching = networkStatus === NetworkStatus.refetch;

  return {
    rows: contents,
    totalCount,
    pageCount,
    pagination,
    setPagination,
    loading,
    isRefetching,
    refetch,
  };
}
