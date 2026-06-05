import { useTranslation } from 'react-i18next';
import { CalendarDateRangePicker } from './date-range-picker';

export const AnalyticsHeader = () => {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-bold tracking-tight">{t('contents.analytics.header.overview')}</h2>
        <div className="flex items-center space-x-2">
          <CalendarDateRangePicker />
        </div>
      </div>
    </>
  );
};

AnalyticsHeader.displayName = 'AnalyticsHeader';
