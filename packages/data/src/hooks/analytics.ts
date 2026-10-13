import { type ApolloQueryResult, useApolloClient } from '@apollo/client';
import { useCallback } from 'react';
import { type TypedQueryOptions, useTypedQuery } from '../query';

import {
  type AnalyticsOrder,
  type AnalyticsQuery,
  QueryContentAnalyticsDocument,
  type QueryContentAnalyticsQuery,
  type QueryContentAnalyticsQueryVariables,
  QueryTrackerUsersDocument,
  type QueryTrackerUsersQuery,
  type QueryTrackerUsersQueryVariables,
} from '../graphql';

// Domain wrapper for `queryContentAnalytics`. The date-range / preset
// UI state lives in the apps/web `AnalyticsUIContext`; this wrapper
// is fetchPolicy-agnostic so callers can opt into shared-cache
// participation as they need.

/** The counts plus the breakdowns, each a list of its analytics view type or null when there is none. */
export type AnalyticsData = QueryContentAnalyticsQuery['queryContentAnalytics'];

interface UseQueryContentAnalyticsArgs {
  environmentId: string | undefined;
  contentId: string;
  startDate?: string;
  endDate?: string;
  timezone: string;
  options?: TypedQueryOptions<QueryContentAnalyticsQuery, QueryContentAnalyticsQueryVariables>;
}

export const useQueryContentAnalyticsQuery = ({
  environmentId,
  contentId,
  startDate,
  endDate,
  timezone,
  options,
}: UseQueryContentAnalyticsArgs) => {
  const isDateRangeComplete = Boolean(startDate && endDate);

  const { data, loading, refetch, error } = useTypedQuery(QueryContentAnalyticsDocument, {
    // skip guards the three below.
    variables: {
      environmentId: environmentId!,
      contentId,
      startDate: startDate!,
      endDate: endDate!,
      timezone,
    },
    skip: !environmentId || !isDateRangeComplete,
    ...options,
  });

  return {
    analyticsData: data?.queryContentAnalytics,
    loading,
    refetch,
    error,
  };
};

// ---- QueryTrackerUsersDocument (cursor pagination) ----

type TrackerUsersConnection = QueryTrackerUsersQuery['queryTrackerUsers'];

export type TrackerUserEdge = NonNullable<TrackerUsersConnection['edges']>[number];

/** One tracked user of the report. */
export type TrackerUser = TrackerUserEdge['node'];

interface UseQueryTrackerUsersArgs {
  first?: number;
  after?: string | null;
  query: AnalyticsQuery;
  orderBy?: AnalyticsOrder;
  options?: TypedQueryOptions<QueryTrackerUsersQuery, QueryTrackerUsersQueryVariables>;
}

export const useQueryTrackerUsersQuery = ({
  first,
  after,
  query,
  orderBy = { field: 'createdAt', direction: 'desc' },
  options,
}: UseQueryTrackerUsersArgs) => {
  const { data, loading, refetch } = useTypedQuery(QueryTrackerUsersDocument, {
    variables: { first, after, query, orderBy },
    ...options,
  });
  const result = data?.queryTrackerUsers;
  const edges = result?.edges ?? [];
  return {
    edges,
    users: edges.map((edge) => edge.node),
    pageInfo: result?.pageInfo,
    totalCount: result?.totalCount ?? 0,
    loading,
    refetch,
  };
};

/**
 * Every tracked user of the report, fetched page by page for an export.
 * Imperative (called from the export handler), so it reads through the
 * Apollo client; `network-only` so a cached page cannot shorten the file.
 */
export const useFetchAllTrackerUsers = () => {
  const client = useApolloClient();
  return useCallback(
    async (
      query: AnalyticsQuery,
      orderBy: AnalyticsOrder = { field: 'createdAt', direction: 'desc' },
      pageSize = 200,
    ): Promise<TrackerUser[]> => {
      const users: TrackerUser[] = [];
      let after: string | null = null;
      while (true) {
        // Annotated: `after` is narrowed by the loop's assignment below, which
        // would make the result's type depend on itself.
        const result: ApolloQueryResult<QueryTrackerUsersQuery> = await client.query<
          QueryTrackerUsersQuery,
          QueryTrackerUsersQueryVariables
        >({
          query: QueryTrackerUsersDocument,
          variables: { first: pageSize, after, query, orderBy },
          fetchPolicy: 'network-only',
        });
        const connection = result.data?.queryTrackerUsers;
        const edges = connection?.edges ?? [];
        users.push(...edges.map((edge) => edge.node));
        const endCursor = connection?.pageInfo?.endCursor;
        if (!connection?.pageInfo?.hasNextPage || !endCursor || edges.length === 0) {
          break;
        }
        after = endCursor;
      }
      return users;
    },
    [client],
  );
};
