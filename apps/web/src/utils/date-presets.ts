import { endOfDay, startOfDay, subDays, subMonths } from 'date-fns';
import type { DateRange } from 'react-day-picker';

// Date range preset types
export type DatePresetKey = '30d' | '3m' | '6m' | '12m';

export interface DatePresetOption {
  key: DatePresetKey;
  label: string;
  getRange: () => DateRange;
}

// Date range preset options
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
