import type { PaginationState } from '@tanstack/react-table';
import { useQueryBizSessionsQuery } from '@usertour/hooks';
import type { Pagination } from '@usertour/types';
import { endOfDay, startOfDay } from 'date-fns';
import { useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';

// Replaces `BizSessionContext`. Same shape as `useContentList`:
// caller owns `pagination` as a `useState`, the hook handles the
// cursor-state translation for relay-style `first/after/last/before`
// arguments. `environmentId` is read from `useAppContext` so callers
// don't have to plumb it through.
//
// `dateRange` + `timezone` are supplied by the caller (they live in
// the analytics context for the analytics tab); when the range
// changes the caller is responsible for resetting `pagination`.
export const useBizSessions = (
  contentId: string,
  pagination: PaginationState,
  dateRange: DateRange | undefined,
  timezone: string,
) => {
  const { environment } = useAppContext();

  // Cursor pagination state — translates TanStack Table's page-index
  // semantics into relay-style `first/after/last/before` arguments.
  // Ported byte-equivalent from the old `BizSessionProvider`.
  const [requestPagination, setRequestPagination] = useState<Pagination>({
    first: pagination.pageSize,
  });
  const [currentPagination, setCurrentPagination] = useState<PaginationState>(pagination);

  const { bizSessions, pageInfo, totalCount, refetch, loading } = useQueryBizSessionsQuery({
    query: {
      environmentId: environment?.id ?? '',
      contentId,
      startDate: dateRange?.from ? startOfDay(new Date(dateRange.from)).toISOString() : undefined,
      endDate: dateRange?.to ? endOfDay(new Date(dateRange.to)).toISOString() : undefined,
      timezone,
    },
    pagination: requestPagination,
    options: { ...SHARED_CACHE_QUERY_OPTIONS, skip: !environment?.id },
  });

  const pageCount = Math.ceil(totalCount / currentPagination.pageSize);

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
    } else if (pageInfo && pageIndex > currentPagination.pageIndex) {
      varis = { first: pageSize, after: pageInfo.endCursor };
    } else if (pageInfo && pageIndex < currentPagination.pageIndex) {
      varis = { last: pageSize, before: pageInfo.startCursor };
    }
    setCurrentPagination({ ...pagination });
    setRequestPagination(varis);
  }, [pagination, currentPagination, pageInfo, totalCount, pageCount]);

  return { bizSessions, totalCount, pageCount, refetch, loading };
};
