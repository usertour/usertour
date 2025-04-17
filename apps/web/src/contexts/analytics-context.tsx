import { useQuery } from '@apollo/client';
import { queryContentAnalytics } from '@usertour-ui/gql';
import { AnalyticsData, AnalyticsQuery } from '@usertour-ui/types';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';

export interface AnalyticsProviderProps {
  children?: ReactNode;
  contentId: string;
}

export interface AnalyticsContextValue {
  analyticsData: AnalyticsData | undefined;
  refetch: any;
  query: AnalyticsQuery;
  setQuery: React.Dispatch<React.SetStateAction<AnalyticsQuery>>;
  dateRange: DateRange | undefined;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  timezone: string;
  contentId: string;
}

export const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

export function AnalyticsProvider(props: AnalyticsProviderProps): JSX.Element {
  const { children, contentId } = props;
  const [query, setQuery] = useState<AnalyticsQuery>({ contentId, startDate: '', endDate: '' });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | undefined>();
  const now = new Date();
  const defaultDateRange = {
    from: startOfDay(new Date(subDays(now, 29))),
    to: endOfDay(new Date(now)),
  };
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data, refetch } = useQuery(queryContentAnalytics, {
    variables: {
      contentId,
      startDate: dateRange?.from ? startOfDay(new Date(dateRange.from)).toISOString() : undefined,
      endDate: dateRange?.to ? endOfDay(new Date(dateRange.to)).toISOString() : undefined,
      timezone,
    },
  });

  useEffect(() => {
    if (data?.queryContentAnalytics) {
      setAnalyticsData(data.queryContentAnalytics);
    }
  }, [data]);

  const value: AnalyticsContextValue = {
    refetch,
    analyticsData,
    query,
    setQuery,
    dateRange,
    setDateRange,
    timezone,
    contentId,
  };

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalyticsContext(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within a AnalyticsProvider.');
  }
  return context;
}
