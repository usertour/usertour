import { type QueryHookOptions, useQuery } from '@apollo/client';
import { queryContentAnalytics, queryTrackerUsers } from '@usertour/gql';
import type { AnalyticsData, PageInfo } from '@usertour/types';

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
  options?: QueryHookOptions;
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

  const { data, loading, refetch, error } = useQuery(queryContentAnalytics, {
    variables: {
      environmentId,
      contentId,
      startDate,
      endDate,
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

// ---- queryTrackerUsers (cursor pagination) ----

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
  options?: QueryHookOptions;
}

export const useQueryTrackerUsersQuery = ({
  first,
  after,
  query,
  orderBy = { field: 'createdAt', direction: 'desc' },
  options,
}: UseQueryTrackerUsersArgs) => {
  const { data, loading, refetch } = useQuery(queryTrackerUsers, {
    variables: { first, after, query, orderBy },
    ...options,
  });
  const result = data?.queryTrackerUsers;
  const edges: TrackerUserEdge[] = result?.edges ?? [];
  return {
    edges,
    users: edges.map((edge) => edge.node),
    pageInfo: result?.pageInfo as PageInfo | undefined,
    totalCount: (result?.totalCount as number | undefined) ?? 0,
    loading,
    refetch,
  };
};
