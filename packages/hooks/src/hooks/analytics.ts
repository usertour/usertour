import { type QueryHookOptions, useQuery } from '@apollo/client';
import { queryContentAnalytics } from '@usertour/gql';
import type { AnalyticsData } from '@usertour/types';

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
