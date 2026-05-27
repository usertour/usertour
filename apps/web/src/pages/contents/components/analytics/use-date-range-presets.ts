import { DATE_PRESET_RANGE_GETTERS, type DatePresetKey, type DatePresetOption } from '@usertour/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Pairs each canonical DatePresetKey with its localized label. Stable
// reference per locale via useMemo; both date-range-pickers on the
// analytics page share this hook.
export const useDateRangePresets = (): DatePresetOption[] => {
  const { t } = useTranslation();
  return useMemo(() => {
    const labels: Record<DatePresetKey, string> = {
      today: t('common.datePresets.today'),
      yesterday: t('common.datePresets.yesterday'),
      'last-7-days': t('common.datePresets.last7Days'),
      'last-14-days': t('common.datePresets.last14Days'),
      'last-30-days': t('common.datePresets.last30Days'),
      'last-90-days': t('common.datePresets.last90Days'),
      'this-month': t('common.datePresets.thisMonth'),
      'year-to-date': t('common.datePresets.yearToDate'),
      'all-time': t('common.datePresets.allTime'),
    };
    return (Object.keys(labels) as DatePresetKey[]).map((key) => ({
      key,
      label: labels[key],
      getRange: DATE_PRESET_RANGE_GETTERS[key],
    }));
  }, [t]);
};
