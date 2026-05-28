'use client';

import { useAnalyticsContext } from '@/contexts/analytics-context';
import { DateRangePicker } from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { useDateRangePresets } from './use-date-range-presets';

/**
 * CalendarDateRangePicker - Context-connected wrapper
 * Uses global AnalyticsContext for state management; resolves i18n labels
 * locally and hands the assembled preset list to the (i18n-agnostic)
 * primitive.
 */
export function CalendarDateRangePicker({ className }: { className?: string }) {
  const { dateRange, setDateRange, selectedPreset, setSelectedPreset } = useAnalyticsContext();
  const { t } = useTranslation();
  const presets = useDateRangePresets();

  return (
    <DateRangePicker
      className={className}
      dateRange={dateRange}
      setDateRange={setDateRange}
      selectedPreset={selectedPreset}
      setSelectedPreset={setSelectedPreset}
      presets={presets}
      placeholder={t('common.pickADate')}
    />
  );
}
