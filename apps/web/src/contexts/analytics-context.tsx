import { useQuery } from '@apollo/client';
import { queryContentAnalytics } from '@usertour-packages/gql';
import { AnalyticsData, AnalyticsQuery } from '@usertour/types';
import { endOfDay, startOfDay, subDays, subMonths } from 'date-fns';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { useAppContext } from './app-context';

// Date range preset types and options
export type DatePresetKey = '30d' | '3m' | '6m' | '12m';

export interface DatePresetOption {
  key: DatePresetKey;
  label: string;
  getRange: () => DateRange;
}

export const DATE_PRESET_OPTIONS: DatePresetOption[] = [
  {
    key: '30d',
    label: 'Past 30 days',
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
    },
  },
  {
    key: '3m',
    label: 'Past 3 months',
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(subMonths(today, 3)), to: endOfDay(today) };
    },
  },
  {
    key: '6m',
    label: 'Past 6 months',
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(subMonths(today, 6)), to: endOfDay(today) };
    },
  },
  {
    key: '12m',
    label: 'Past 12 months',
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(subMonths(today, 12)), to: endOfDay(today) };
    },
  },
];

export const DEFAULT_PRESET_KEY: DatePresetKey = '30d';

export interface AnalyticsProviderProps {
  children?: ReactNode;
  contentId: string;
}

export interface AnalyticsContextValue {
  analyticsData: AnalyticsData | undefined;
  loading: boolean;
  refetch: any;
  query: AnalyticsQuery;
  setQuery: React.Dispatch<React.SetStateAction<AnalyticsQuery>>;
  dateRange: DateRange | undefined;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  selectedPreset: DatePresetKey | null;
  setSelectedPreset: React.Dispatch<React.SetStateAction<DatePresetKey | null>>;
  timezone: string;
  contentId: string;
}

export const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

export function AnalyticsProvider(props: AnalyticsProviderProps): JSX.Element {
  const { children, contentId } = props;
  const [query, setQuery] = useState<AnalyticsQuery>({ contentId, startDate: '', endDate: '' });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | undefined>();
  const [selectedPreset, setSelectedPreset] = useState<DatePresetKey | null>(DEFAULT_PRESET_KEY);

  // Generate default date range from default preset
  const defaultDateRange = useMemo(() => {
    const preset = DATE_PRESET_OPTIONS.find((p) => p.key === DEFAULT_PRESET_KEY);
    return preset?.getRange();
  }, []);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange);
  const { environment } = useAppContext();

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Only execute query when both from and to dates are selected
  const isDateRangeComplete = Boolean(dateRange?.from && dateRange?.to);

  const { data, refetch, loading } = useQuery(queryContentAnalytics, {
    variables: {
      environmentId: environment?.id,
      contentId,
      startDate: dateRange?.from ? startOfDay(new Date(dateRange.from)).toISOString() : undefined,
      endDate: dateRange?.to ? endOfDay(new Date(dateRange.to)).toISOString() : undefined,
      timezone,
    },
    skip: !isDateRangeComplete,
  });

  useEffect(() => {
    if (data?.queryContentAnalytics) {
      setAnalyticsData(data.queryContentAnalytics);
    }
  }, [data]);

  const value: AnalyticsContextValue = {
    refetch,
    analyticsData,
    loading,
    query,
    setQuery,
    dateRange,
    setDateRange,
    selectedPreset,
    setSelectedPreset,
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
