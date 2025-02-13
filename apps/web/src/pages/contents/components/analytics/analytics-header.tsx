import { CalendarDateRangePicker } from './date-range-picker';

export const AnalyticsHeader = () => {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-bold tracking-tight">Overview</h2>
        <div className="flex items-center space-x-2">
          <CalendarDateRangePicker />
        </div>
      </div>
    </>
  );
};

AnalyticsHeader.displayName = 'AnalyticsHeader';
