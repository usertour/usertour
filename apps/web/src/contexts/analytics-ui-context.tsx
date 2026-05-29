import { DATE_PRESET_RANGE_GETTERS, DEFAULT_PRESET_KEY, type DatePresetKey } from '@usertour/ui';
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { DateRange } from 'react-day-picker';

// UI state for the content analytics tab. Replaces the old
// `AnalyticsContext` Provider for everything that wasn't the actual
// `queryContentAnalytics` server data — that moved to
// `useContentAnalytics`. Date range / preset / timezone are coordinated
// across the date-range picker + every analytics card consuming the
// range, so a Context is the right primitive.

export interface AnalyticsUIContextValue {
  contentId: string;
  dateRange: DateRange | undefined;
  setDateRange: Dispatch<SetStateAction<DateRange | undefined>>;
  selectedPreset: DatePresetKey | null;
  setSelectedPreset: Dispatch<SetStateAction<DatePresetKey | null>>;
  timezone: string;
}

const AnalyticsUIContext = createContext<AnalyticsUIContextValue | undefined>(undefined);

export interface AnalyticsUIProviderProps {
  children: ReactNode;
  contentId: string;
}

export const AnalyticsUIProvider = (props: AnalyticsUIProviderProps): JSX.Element => {
  const { children, contentId } = props;
  // Seed with the same default-preset range the old AnalyticsContext
  // used so the analytics tab opens to the same page as before.
  const defaultDateRange = useMemo(() => DATE_PRESET_RANGE_GETTERS[DEFAULT_PRESET_KEY](), []);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange);
  const [selectedPreset, setSelectedPreset] = useState<DatePresetKey | null>(DEFAULT_PRESET_KEY);
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const value = useMemo<AnalyticsUIContextValue>(
    () => ({ contentId, dateRange, setDateRange, selectedPreset, setSelectedPreset, timezone }),
    [contentId, dateRange, selectedPreset, timezone],
  );

  return <AnalyticsUIContext.Provider value={value}>{children}</AnalyticsUIContext.Provider>;
};

export const useAnalyticsUI = (): AnalyticsUIContextValue => {
  const context = useContext(AnalyticsUIContext);
  if (!context) {
    throw new Error('useAnalyticsUI must be used within an AnalyticsUIProvider.');
  }
  return context;
};
