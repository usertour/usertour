'use client';

import { useAnalyticsContext } from '@/contexts/analytics-context';
import { DateRangePicker } from '@usertour/ui';

/**
 * CalendarDateRangePicker - Context-connected wrapper
 * Uses global AnalyticsContext for state management
 */
export function CalendarDateRangePicker({ className }: { className?: string }) {
  const { dateRange, setDateRange, selectedPreset, setSelectedPreset } = useAnalyticsContext();

  return (
    <DateRangePicker
      className={className}
      dateRange={dateRange}
      setDateRange={setDateRange}
      selectedPreset={selectedPreset}
      setSelectedPreset={setSelectedPreset}
    />
  );
}
