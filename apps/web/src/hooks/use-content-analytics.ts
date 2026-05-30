import { useQueryContentAnalyticsQuery } from '@usertour/hooks';
import { endOfDay, startOfDay } from 'date-fns';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAnalyticsUI } from '@/contexts/analytics-ui-context';
import { useAppContext } from '@/contexts/app-context';

// Thin app-level wrapper that joins the analytics UI state (date range
// from `AnalyticsUIContext`, environment from `AppContext`) with the
// `queryContentAnalytics` data hook. Replaces the data half of the
// old `AnalyticsContext`.
//
// Shared-cache participation so multiple analytics cards reading
// `analyticsData` dedupe via Apollo's cache slot — the old Context
// gave them a single query mounted at the top; we get the same result
// here via cache identity.
export const useContentAnalytics = () => {
  const { contentId, dateRange, timezone } = useAnalyticsUI();
  const { environment } = useAppContext();

  return useQueryContentAnalyticsQuery({
    environmentId: environment?.id,
    contentId,
    startDate: dateRange?.from ? startOfDay(new Date(dateRange.from)).toISOString() : undefined,
    endDate: dateRange?.to ? endOfDay(new Date(dateRange.to)).toISOString() : undefined,
    timezone,
    options: SHARED_CACHE_QUERY_OPTIONS,
  });
};
