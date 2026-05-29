import type { PaginationState } from '@tanstack/react-table';
import { useContentListQuery } from '@usertour/hooks';
import type { Pagination } from '@usertour/types';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { getQueryType } from '@/utils/content';

// Replaces `ContentListProvider`. Caller (typically content-list-layout)
// owns `pagination` via `useState` and passes it in — that keeps the
// hook stateless from the consumer's perspective and lets the same
// page tree share one pagination source. `published` is read directly
// from the URL, since the URL is the single source of truth (sidebar
// dispatches via `setSearchParams`); no separate store is needed.
//
// `SHARED_CACHE_QUERY_OPTIONS` is baked in so callers don't have to
// thread it through.
export const useContentList = (
  environmentId: string | undefined,
  contentType: string,
  pagination: PaginationState,
) => {
  const [searchParams] = useSearchParams();
  const published = searchParams.get('published') === '1';

  // Cursor pagination state — translates TanStack Table's page-index
  // semantics into relay-style `first/after/last/before` arguments.
  // Ported byte-equivalent from the old `ContentListProvider` so the
  // forward / backward / jump-to-last math behaves identically.
  const [requestPagination, setRequestPagination] = useState<Pagination>({
    first: pagination.pageSize,
  });
  const [currentPagination, setCurrentPagination] = useState<PaginationState>(pagination);

  const { contents, pageInfo, totalCount, refetch, loading } = useContentListQuery({
    query: { environmentId: environmentId ?? '', type: getQueryType(contentType), published },
    pagination: requestPagination,
    options: { ...SHARED_CACHE_QUERY_OPTIONS, skip: !environmentId },
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

  return {
    contents,
    totalCount,
    pageCount,
    refetch,
    isLoading: loading,
    published,
  };
};
