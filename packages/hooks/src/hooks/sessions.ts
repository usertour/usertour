import { type QueryHookOptions, useQuery } from '@apollo/client';
import { listSessionsDetail, queryBizSession } from '@usertour/gql';
import type { BizSession, PageInfo, Pagination } from '@usertour/types';

// Domain wrapper for `queryBizSession`. The cursor-state book-keeping
// the table needs (currentPageInfo / pageCount derivation) lives in the
// apps/web caller — same split as `useContentListQuery` /
// `useContentList`.

interface QueryBizSessionVariables {
  environmentId: string;
  contentId: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

interface UseQueryBizSessionsArgs {
  query: QueryBizSessionVariables;
  pagination?: Pagination;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  options?: QueryHookOptions;
}

export const useQueryBizSessionsQuery = ({
  query,
  orderBy = { field: 'createdAt', direction: 'desc' },
  pagination = { first: 10 },
  options,
}: UseQueryBizSessionsArgs) => {
  const { data, refetch, error, loading, networkStatus } = useQuery(queryBizSession, {
    variables: {
      ...pagination,
      query,
      orderBy,
    },
    ...options,
  });

  const connection = data?.queryBizSession;
  // Return shape aligned with the other list-query wrappers
  // (`useUserListQuery` / `useCompanyListQuery`) so callers can plug
  // any of them into `useCursorPagination` without per-entity
  // adapters. `networkStatus` exposed for `isRefetching` derivation.
  const contents: BizSession[] =
    connection?.edges?.map((edge: { node: BizSession }) => edge.node) ?? [];
  const pageInfo: PageInfo | undefined = connection?.pageInfo;
  const totalCount: number = connection?.totalCount ?? 0;

  return { contents, pageInfo, totalCount, refetch, error, loading, networkStatus };
};

// ---- listSessionsDetail ----
//
// Heavier per-session payload than `queryBizSession` (includes
// `bizUser.bizUsersOnCompany`, `bizEvent[]`, etc.) — used by the CSV
// export flow which calls `refetch` imperatively in a cursor loop
// rather than as a reactive query. Callers typically set
// `options: { skip: true }` so the auto-fetch never fires; the export
// handler then calls `refetch({ first, after, query, orderBy })`
// page by page.

interface ListSessionsDetailVariables {
  environmentId: string;
  contentId: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

interface UseListSessionsDetailArgs {
  query: ListSessionsDetailVariables;
  pagination?: Pagination;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  options?: QueryHookOptions;
}

export const useListSessionsDetailQuery = ({
  query,
  orderBy = { field: 'createdAt', direction: 'desc' },
  pagination = { first: 100 },
  options,
}: UseListSessionsDetailArgs) => {
  const { data, refetch, error, loading } = useQuery(listSessionsDetail, {
    variables: {
      ...pagination,
      query,
      orderBy,
    },
    ...options,
  });
  return { data, refetch, error, loading };
};
