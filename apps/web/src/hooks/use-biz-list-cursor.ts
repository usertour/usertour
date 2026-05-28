import { NetworkStatus } from '@apollo/client';
import type { PaginationState } from '@tanstack/react-table';
import type { PageInfo, Pagination } from '@usertour/types';
import { useEffect, useState } from 'react';

// Generic engine that pairs an @usertour/hooks Apollo list-query wrapper
// with the cursor pagination state TanStack Table doesn't manage. The
// caller injects the entity-specific wrapper (`useUserListQuery` /
// `useCompanyListQuery`) so this hook stays entity-agnostic. The caller
// also owns `query` and `pagination` (typically `useState` in the page
// parent) — they're inputs, not internal state.
//
// Per ADR 0002 the Apollo wrapper lives in @usertour/hooks; this hook
// only adds the cursor-state book-keeping the table expects.

export interface BizListQueryArgs {
  query: { environmentId: string; [key: string]: unknown };
  pagination?: Pagination;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  options?: { skip?: boolean; notifyOnNetworkStatusChange?: boolean };
}

export interface BizListQueryResult<T> {
  contents: T[];
  pageInfo: PageInfo | undefined;
  totalCount: number;
  loading: boolean;
  refetch: () => Promise<unknown>;
  networkStatus: NetworkStatus;
}

interface UseBizListCursorArgs<T> {
  environmentId: string | undefined;
  query: Record<string, unknown>;
  pagination: PaginationState;
  useListQuery: (args: BizListQueryArgs) => BizListQueryResult<T>;
}

export interface BizListCursorResult<T> {
  contents: T[];
  loading: boolean;
  isRefetching: boolean;
  refetch: () => Promise<unknown>;
  pageCount: number;
}

export function useBizListCursor<T>(args: UseBizListCursorArgs<T>): BizListCursorResult<T> {
  const { environmentId, query, pagination, useListQuery } = args;

  const [requestPagination, setRequestPagination] = useState<Pagination>({
    first: pagination.pageSize,
  });
  const [currentPagination, setCurrentPagination] = useState<PaginationState>(pagination);
  const [currentPageInfo, setCurrentPageInfo] = useState<PageInfo>();
  const [pageCount, setPageCount] = useState(pagination.pageSize);
  const [totalCount, setTotalCount] = useState<number>(0);

  const {
    contents,
    pageInfo,
    totalCount: tc,
    loading,
    refetch,
    networkStatus,
  } = useListQuery({
    query: { environmentId: environmentId ?? '', ...query },
    pagination: requestPagination,
    options: { skip: !environmentId, notifyOnNetworkStatusChange: true },
  });

  const isRefetching = networkStatus === NetworkStatus.refetch;

  // Translate page-index changes into the right relay-style cursor args.
  useEffect(() => {
    const { pageIndex, pageSize } = pagination;
    if (pageSize === currentPagination.pageSize && pageIndex === currentPagination.pageIndex) {
      return;
    }
    let varis: Pagination = { first: pageSize };
    if (pageIndex === 0) {
      varis = { first: pageSize };
    } else if (pageIndex + 1 === pageCount) {
      const costSize = totalCount - (pageCount - 1) * pageSize;
      varis = { last: costSize > 0 ? costSize : pageSize };
    } else if (currentPageInfo && pageIndex > currentPagination.pageIndex) {
      varis = { first: pageSize, after: currentPageInfo.endCursor };
    } else if (currentPageInfo && pageIndex < currentPagination.pageIndex) {
      varis = { last: pageSize, before: currentPageInfo.startCursor };
    }
    setCurrentPagination({ ...pagination });
    setRequestPagination(varis);
  }, [pagination, currentPagination, currentPageInfo, pageCount, totalCount]);

  useEffect(() => {
    if (!pageInfo) return;
    setCurrentPageInfo(pageInfo);
    setTotalCount(tc);
    setPageCount(Math.ceil(tc / currentPagination.pageSize));
  }, [pageInfo, tc, currentPagination.pageSize]);

  // No explicit refetch on var change — Apollo's `useQuery` inside the
  // injected wrapper already re-runs when its variables change, hitting
  // the network on cache miss. The pre-D0 BizListContext had a manual
  // refetch effect here; it caused redundant calls (mount fetched twice,
  // every var change fired both Apollo's auto-fetch and a manual one
  // that bypassed cache).

  return { contents, loading, isRefetching, refetch, pageCount };
}
