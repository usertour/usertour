import { type TypedQueryOptions, useTypedQuery } from '../query';

import type { Pagination } from '@usertour/types';
import {
  type AnalyticsOrder,
  type AnalyticsQuery,
  type BizSessionFieldsFragment,
  ListSessionsDetailDocument,
  type ListSessionsDetailQuery,
  type ListSessionsDetailQueryVariables,
  QueryBizSessionDocument,
  type QueryBizSessionQuery,
  type QueryBizSessionQueryVariables,
  DeleteSessionDocument,
  EndSessionDocument,
  QuerySessionDetailDocument,
  QuerySessionsByExternalIdDocument,
  type SessionQuery,
} from '../graphql';
import { useCallback } from 'react';
import { useMutation } from '@apollo/client';

/** A session as the session list, the user's session list and the session detail return it (the `BizSessionFields` fragment). */
export type BizSession = BizSessionFieldsFragment;

/** A session row of the CSV export: the counts and events, without the content and the steps. */
export type SessionExportRow = NonNullable<
  ListSessionsDetailQuery['listSessionsDetail']['edges']
>[number]['node'];

// Domain wrapper for `queryBizSession`. The cursor-state book-keeping
// the table needs (currentPageInfo / pageCount derivation) lives in the
// apps/web caller — same split as `useContentListQuery` /
// `useContentList`.

interface UseQueryBizSessionsArgs {
  query: AnalyticsQuery;
  pagination?: Pagination;
  orderBy?: AnalyticsOrder;
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
      query,
      orderBy,
    },
  });

  const connection = data?.queryBizSession;
  // Return shape aligned with the other list-query wrappers
  // (`useUserListQuery` / `useCompanyListQuery`) so callers can plug
  // any of them into `useCursorPagination` without per-entity
  // adapters. `networkStatus` exposed for `isRefetching` derivation.
  const contents = connection?.edges?.map((edge) => edge.node) ?? [];
  const pageInfo = connection?.pageInfo;
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

interface UseListSessionsDetailArgs {
  query: AnalyticsQuery;
  pagination?: Pagination;
  orderBy?: AnalyticsOrder;
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
      query,
      orderBy,
    },
    ...options,
  });
  return { data, refetch, error, loading };
};

export const useDeleteSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteSessionDocument);
  const invoke = useCallback(
    async (sessionId: string): Promise<boolean> => {
      const response = await mutation({ variables: { sessionId } });
      return !!response.data?.deleteSession;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useEndSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(EndSessionDocument);
  const invoke = useCallback(
    async (sessionId: string): Promise<boolean> => {
      const response = await mutation({ variables: { sessionId } });
      return !!response.data?.endSession;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useQuerySessionDetailQuery = (sessionId: string) => {
  const { data, loading, error, refetch } = useTypedQuery(QuerySessionDetailDocument, {
    variables: { sessionId },
  });

  const session = data?.querySessionDetail;
  return { session, loading, error, refetch };
};

export const useQuerySessionsByExternalIdQuery = (
  query: SessionQuery,
  pagination: Pagination = { first: 10 },
  orderBy: AnalyticsOrder = { field: 'createdAt', direction: 'desc' },
) => {
  const { data, loading, refreshing, error, refetch } = useTypedQuery(
    QuerySessionsByExternalIdDocument,
    {
      variables: {
        query,
        orderBy,
        ...pagination,
      },
      // Reload goes through `refetch()`; without this the refetch window
      // has `loading: false`, so the UI gets no in-flight signal.
      notifyOnNetworkStatusChange: true,
    },
  );

  const sessions = data?.querySessionsByExternalId?.edges?.map((edge) => edge.node) ?? [];
  const pageInfo = data?.querySessionsByExternalId?.pageInfo;
  const totalCount = data?.querySessionsByExternalId?.totalCount || 0;

  // In-flight `loading`: the reload button and the accumulator gate on it.
  return { sessions, pageInfo, totalCount, loading: loading || refreshing, error, refetch };
};
