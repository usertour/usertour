import { type DocumentNode, type QueryHookOptions, useQuery } from '@apollo/client';
import { queryBizCompanyEvents, queryBizUserEvents } from '@usertour/gql';
import type { BizEvent, PageInfo } from '@usertour/types';
import { useMemo } from 'react';
import { useCursorFetchMore } from './use-cursor-fetch-more';

// Domain wrapper for `queryBizUserEvents` / `queryBizCompanyEvents`
// activity-feed queries. Cursor pagination via Apollo's `fetchMore`
// with a `fetchingRef` dedup — same shape as
// `useListContentVersionsQuery`. Replaces the `ActivityFeedContext`
// `setEvents`/`afterCursor` mirror, which was effectively reimplementing
// Apollo's fetchMore + dedup on top of `useState`.

const PAGE_SIZE = 20;

interface ActivityFeedEdge {
  node: BizEvent;
}

interface ActivityFeedConnection {
  edges: ActivityFeedEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

interface ActivityFeedQueryVariables {
  environmentId: string;
  userId?: string;
  companyId?: string;
}

const useActivityFeedQuery = (
  gqlQuery: DocumentNode,
  queryKey: string,
  query: ActivityFeedQueryVariables,
  options?: QueryHookOptions,
) => {
  const { data, loading, networkStatus, fetchMore, refetch } = useQuery(gqlQuery, {
    variables: {
      first: PAGE_SIZE,
      query,
      orderBy: { field: 'createdAt', direction: 'desc' },
    },
    notifyOnNetworkStatusChange: true,
    ...options,
  });

  const connection = data?.[queryKey] as ActivityFeedConnection | undefined;
  const events = useMemo(
    () => connection?.edges?.map((edge) => edge.node) ?? [],
    [connection?.edges],
  );
  const totalCount = connection?.totalCount ?? 0;
  const hasNextPage = connection?.pageInfo?.hasNextPage ?? false;
  const endCursor = connection?.pageInfo?.endCursor ?? null;

  // Cache-level merge with id-based dedup owned by the typePolicy on
  // `Query.queryBizUserEvents` / `Query.queryBizCompanyEvents`
  // (apps/web/src/apollo/type-policies). The activity feed's reload
  // button (`refetch`) is the no-cursor base fetch path — the
  // typePolicy replaces the accumulator with the fresh page 1 instead
  // of leaving stale events on top.
  const { loadingMore, fetchNextPage: loadMore } = useCursorFetchMore({
    loading,
    networkStatus,
    hasNextPage,
    endCursor,
    fetchMore,
    buildVariables: (after) => ({
      first: PAGE_SIZE,
      after,
      query,
      orderBy: { field: 'createdAt', direction: 'desc' },
    }),
  });

  return {
    events,
    loading: loading && !loadingMore,
    loadingMore,
    totalCount,
    hasNextPage,
    refetch,
    loadMore,
  };
};

export const useUserActivityFeedQuery = (
  environmentId: string,
  userId: string,
  options?: QueryHookOptions,
) =>
  useActivityFeedQuery(
    queryBizUserEvents,
    'queryBizUserEvents',
    { environmentId, userId },
    options,
  );

export const useCompanyActivityFeedQuery = (
  environmentId: string,
  companyId: string,
  options?: QueryHookOptions,
) =>
  useActivityFeedQuery(
    queryBizCompanyEvents,
    'queryBizCompanyEvents',
    { environmentId, companyId },
    options,
  );
