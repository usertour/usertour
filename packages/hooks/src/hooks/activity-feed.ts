import { type DocumentNode, type QueryHookOptions, useQuery } from '@apollo/client';
import { queryBizCompanyEvents, queryBizUserEvents } from '@usertour/gql';
import type { BizEvent, PageInfo } from '@usertour/types';
import { useCallback, useMemo, useRef } from 'react';

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

  // networkStatus === 3 is NetworkStatus.fetchMore.
  const loadingMore = networkStatus === 3;
  const fetchingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!hasNextPage || loading || fetchingRef.current || !endCursor) {
      return;
    }
    fetchingRef.current = true;
    try {
      await fetchMore({
        variables: {
          first: PAGE_SIZE,
          after: endCursor,
          query,
          orderBy: { field: 'createdAt', direction: 'desc' },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) {
            return prev;
          }
          const prevConnection = (prev as Record<string, ActivityFeedConnection>)[queryKey];
          const nextConnection = (fetchMoreResult as Record<string, ActivityFeedConnection>)[
            queryKey
          ];
          // Dedup by node id — server pagination can repeat an edge if
          // a row was modified mid-cursor. Preserves the behaviour of
          // the previous `setEvents` accumulator.
          const existingIds = new Set(prevConnection.edges.map((edge) => edge.node.id));
          const mergedEdges = [...prevConnection.edges];
          for (const edge of nextConnection.edges) {
            if (!existingIds.has(edge.node.id)) {
              mergedEdges.push(edge);
            }
          }
          return {
            ...fetchMoreResult,
            [queryKey]: {
              ...nextConnection,
              edges: mergedEdges,
            },
          };
        },
      });
    } finally {
      fetchingRef.current = false;
    }
  }, [endCursor, fetchMore, hasNextPage, loading, query, queryKey]);

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
