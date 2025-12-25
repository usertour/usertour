import { endOfDay, startOfDay, startOfMonth, startOfYear, subDays, subYears } from 'date-fns';
import type { DateRange } from 'react-day-picker';

// Date range preset types
export type DatePresetKey =
  | 'today'
  | 'yesterday'
  | 'last-7-days'
  | 'last-14-days'
  | 'last-30-days'
  | 'last-90-days'
  | 'this-month'
  | 'year-to-date'
  | 'all-time';

export interface DatePresetOption {
  key: DatePresetKey;
  label: string;
  getRange: () => DateRange;
}

// Date range preset options
export const DATE_PRESET_OPTIONS: DatePresetOption[] = [
  {
    key: 'today',
    label: 'Today',
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(today), to: endOfDay(today) };
    },
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    },
  },
  {
    key: 'last-7-days',
    label: 'Last 7 days',
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
    },
  },
  {
    key: 'last-14-days',
    label: 'Last 14 days',
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(subDays(today, 13)), to: endOfDay(today) };
    },
  },
  {
    key: 'last-30-days',
    label: 'Last 30 days',
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
    },
  },
  {
    key: 'last-90-days',
    label: 'Last 90 days',
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(subDays(today, 89)), to: endOfDay(today) };
    },
  },
  {
    key: 'this-month',
    label: 'This month',
    getRange: () => {
      const today = new Date();
      return { from: startOfMonth(today), to: endOfDay(today) };
    },
  },
  {
    key: 'year-to-date',
    label: 'Year to date',
    getRange: () => {
      const today = new Date();
      return { from: startOfYear(today), to: endOfDay(today) };
    },
  },
  {
    key: 'all-time',
    label: 'All time',
    getRange: () => {
      const today = new Date();
      // Query last 5 years
      return { from: startOfDay(subYears(today, 5)), to: endOfDay(today) };
    },
  },
];

export const DEFAULT_PRESET_KEY: DatePresetKey = 'last-30-days';
