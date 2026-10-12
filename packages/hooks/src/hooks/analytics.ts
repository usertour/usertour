import { type TypedQueryOptions, useTypedQuery } from '../query';

import type {
  AnalyticsViewsByBlock,
  AnalyticsViewsByDay,
  AnalyticsViewsByStep,
  AnalyticsViewsByTask,
} from '@usertour/types';
import type { Refined } from './refined';
import {
  type AnalyticsOrder,
  type AnalyticsQuery,
  QueryContentAnalyticsDocument,
  type QueryContentAnalyticsQuery,
  type QueryContentAnalyticsQueryVariables,
  QueryTrackerUsersDocument,
  type QueryTrackerUsersQuery,
  type QueryTrackerUsersQueryVariables,
} from '@usertour/gql';

// Domain wrapper for `queryContentAnalytics`. The date-range / preset
// UI state lives in the apps/web `AnalyticsUIContext`; this wrapper
// is fetchPolicy-agnostic so callers can opt into shared-cache
// participation as they need.

/** The breakdowns travel as JSON; their rows are the analytics view types. */
export type AnalyticsData = Refined<
  QueryContentAnalyticsQuery['queryContentAnalytics'],
  {
    viewsByDay: AnalyticsViewsByDay[];
    viewsByStep: AnalyticsViewsByStep[];
    viewsByTask: AnalyticsViewsByTask[];
    viewsByBlock: AnalyticsViewsByBlock[];
  }
>;

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
    analyticsData: data?.queryContentAnalytics as AnalyticsData | undefined,
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
