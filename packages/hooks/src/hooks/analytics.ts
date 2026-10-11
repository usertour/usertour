import { type TypedQueryOptions, useTypedQuery } from '../query';

import type { AnalyticsData, PageInfo } from '@usertour/types';
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

interface TrackerUserNode {
  id: string;
  firstTrackedAt: string;
  lastTrackedAt: string;
  eventsCount: number;
  bizUser: {
    id: string;
    externalId: string;
    data: Record<string, unknown>;
  };
  bizCompany?: {
    id: string;
    externalId: string;
    data: Record<string, unknown>;
  } | null;
}

interface TrackerUserEdge {
  cursor: string;
  node: TrackerUserNode;
}

interface TrackerUsersQueryVariables {
  environmentId: string;
  contentId: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

interface UseQueryTrackerUsersArgs {
  first?: number;
  after?: string | null;
  query: TrackerUsersQueryVariables;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
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
    variables: { first, after, query: query as AnalyticsQuery, orderBy: orderBy as AnalyticsOrder },
    ...options,
  });
  const result = data?.queryTrackerUsers;
  const edges = (result?.edges ?? []) as TrackerUserEdge[];
  return {
    edges,
    users: edges.map((edge) => edge.node),
    pageInfo: result?.pageInfo as PageInfo | undefined,
    totalCount: (result?.totalCount as number | undefined) ?? 0,
    loading,
    refetch,
  };
};
