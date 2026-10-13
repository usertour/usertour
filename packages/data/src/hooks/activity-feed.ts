import type { NetworkStatus } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';

import { useMemo } from 'react';
import { type UseCursorFetchMoreArgs, useCursorFetchMore } from './use-cursor-fetch-more';
import {
  type BizEventFieldsFragment,
  type BizEventQuery,
  QueryBizCompanyEventsDocument,
  type QueryBizCompanyEventsQuery,
  type QueryBizCompanyEventsQueryVariables,
  QueryBizUserEventsDocument,
  type QueryBizUserEventsQuery,
  type QueryBizUserEventsQueryVariables,
} from '@usertour/gql';

// Domain wrapper for `queryBizUserEvents` / `queryBizCompanyEvents`
// activity-feed queries. Cursor pagination via Apollo's `fetchMore`
// with a `fetchingRef` dedup — same shape as
// `useListContentVersionsQuery`. Replaces the `ActivityFeedContext`
// `setEvents`/`afterCursor` mirror, which was effectively reimplementing
// Apollo's fetchMore + dedup on top of `useState`.

const PAGE_SIZE = 20;

/** An event as the activity feeds return it (the `BizEventFields` fragment). */
export type BizEvent = BizEventFieldsFragment;

/** Both feed queries select the same connection. */
type ActivityFeedConnection = QueryBizUserEventsQuery['queryBizUserEvents'];

/** An event as the feeds list it: the event with the user and company it belongs to. */
export type ActivityFeedEvent = NonNullable<ActivityFeedConnection['edges']>[number]['node'];

const feedVariables = (query: BizEventQuery): QueryBizUserEventsQueryVariables => ({
  first: PAGE_SIZE,
  query,
  orderBy: { field: 'createdAt', direction: 'desc' },
});

/** The feed's paging and return shape, over whichever feed query ran. */
const useActivityFeed = (
  query: BizEventQuery,
  result: {
    loading: boolean;
    refreshing: boolean;
    networkStatus: NetworkStatus;
    fetchMore: UseCursorFetchMoreArgs['fetchMore'];
    refetch: () => Promise<unknown>;
  },
  connection: ActivityFeedConnection | null | undefined,
) => {
  const { loading, refreshing, networkStatus, fetchMore, refetch } = result;
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
  // The feed loads more from a button, not a sentinel: every click is the
  // user asking, failed page or not, so it goes through `retryNextPage`.
  const {
    loadingMore,
    pageFailed,
    retryNextPage: loadMore,
  } = useCursorFetchMore({
    loading: loading || refreshing,
    networkStatus,
    hasNextPage,
    endCursor,
    fetchMore,
    buildVariables: (after) => ({ ...feedVariables(query), after }),
  });

  return {
    events,
    // In-flight `loading` (a reload keeps the rows); a fetch-more is `loadingMore` instead.
    loading: (loading || refreshing) && !loadingMore,
    loadingMore,
    pageFailed,
    totalCount,
    hasNextPage,
    refetch,
    loadMore,
  };
};

export const useUserActivityFeedQuery = (
  environmentId: string,
  userId: string,
  options?: TypedQueryOptions<QueryBizUserEventsQuery, QueryBizUserEventsQueryVariables>,
) => {
  const query = { environmentId, userId };
  const result = useTypedQuery(QueryBizUserEventsDocument, {
    variables: feedVariables(query),
    notifyOnNetworkStatusChange: true,
    ...options,
  });
  return useActivityFeed(query, result, result.data?.queryBizUserEvents);
};

export const useCompanyActivityFeedQuery = (
  environmentId: string,
  companyId: string,
  options?: TypedQueryOptions<QueryBizCompanyEventsQuery, QueryBizCompanyEventsQueryVariables>,
) => {
  const query = { environmentId, companyId };
  const result = useTypedQuery(QueryBizCompanyEventsDocument, {
    variables: feedVariables(query),
    notifyOnNetworkStatusChange: true,
    ...options,
  });
  return useActivityFeed(query, result, result.data?.queryBizCompanyEvents);
};
