import { type TypedQueryOptions, useTypedQuery } from '../query';

import type { BizSession, PageInfo, Pagination } from '@usertour/types';
import {
  type AnalyticsOrder,
  type AnalyticsQuery,
  ListSessionsDetailDocument,
  type ListSessionsDetailQuery,
  type ListSessionsDetailQueryVariables,
  QueryBizSessionDocument,
  type QueryBizSessionQuery,
  type QueryBizSessionQueryVariables,
} from '@usertour/gql';

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
  options?: TypedQueryOptions<QueryBizSessionQuery, QueryBizSessionQueryVariables>;
}

export const useQueryBizSessionsQuery = ({
  query,
  orderBy = { field: 'createdAt', direction: 'desc' },
  pagination = { first: 10 },
  options,
}: UseQueryBizSessionsArgs) => {
  // See `useContentListQuery` in `gql.ts` — `...options` first,
  // `variables` last, so caller can't accidentally clobber
  // wrapper-composed variables.
  const { data, refetch, error, loading, networkStatus } = useTypedQuery(QueryBizSessionDocument, {
    ...options,
    variables: {
      ...pagination,
      query: query as AnalyticsQuery,
      orderBy: orderBy as AnalyticsOrder,
    },
  });

  const connection = data?.queryBizSession;
  // Return shape aligned with the other list-query wrappers
  // (`useUserListQuery` / `useCompanyListQuery`) so callers can plug
  // any of them into `useCursorPagination` without per-entity
  // adapters. `networkStatus` exposed for `isRefetching` derivation.
  const contents = (connection?.edges?.map((edge) => edge.node) ?? []) as BizSession[];
  const pageInfo = connection?.pageInfo as PageInfo | undefined;
  const totalCount: number = connection?.totalCount ?? 0;

  return { contents, pageInfo, totalCount, refetch, error, loading, networkStatus };
};

// ---- ListSessionsDetailDocument ----
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
  options?: TypedQueryOptions<ListSessionsDetailQuery, ListSessionsDetailQueryVariables>;
}

export const useListSessionsDetailQuery = ({
  query,
  orderBy = { field: 'createdAt', direction: 'desc' },
  pagination = { first: 100 },
  options,
}: UseListSessionsDetailArgs) => {
  const { data, refetch, error, loading } = useTypedQuery(ListSessionsDetailDocument, {
    variables: {
      ...pagination,
      query: query as AnalyticsQuery,
      orderBy: orderBy as AnalyticsOrder,
    },
    ...options,
  });
  return { data, refetch, error, loading };
};
