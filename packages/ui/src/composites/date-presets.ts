import { endOfDay, startOfDay, startOfMonth, startOfYear, subDays, subYears } from 'date-fns';
import type { DateRange } from 'react-day-picker';

// Keys for the canonical date-range presets. The label for each is supplied
// by the consumer at construction time (i18n-extracted) — this package
// stays out of the i18n business per feedback_no_i18n_in_shared_ui_primitives.
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

export const DEFAULT_PRESET_KEY: DatePresetKey = 'last-30-days';

// Canonical range-getter for each preset key. Consumers compose these with
// their own i18n-resolved labels into the `DateRangePicker.presets` prop.
export const DATE_PRESET_RANGE_GETTERS: Record<DatePresetKey, () => DateRange> = {
  today: () => {
    const today = new Date();
    return { from: startOfDay(today), to: endOfDay(today) };
  },
  yesterday: () => {
    const yesterday = subDays(new Date(), 1);
    return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
  },
  'last-7-days': () => {
    const today = new Date();
    return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
  },
  'last-14-days': () => {
    const today = new Date();
    return { from: startOfDay(subDays(today, 13)), to: endOfDay(today) };
  },
  'last-30-days': () => {
    const today = new Date();
    return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
  },
  'last-90-days': () => {
    const today = new Date();
    return { from: startOfDay(subDays(today, 89)), to: endOfDay(today) };
  },
  'this-month': () => {
    const today = new Date();
    return { from: startOfMonth(today), to: endOfDay(today) };
  },
  'year-to-date': () => {
    const today = new Date();
    return { from: startOfYear(today), to: endOfDay(today) };
  },
  'all-time': () => {
    const today = new Date();
    // Query last 5 years
    return { from: startOfDay(subYears(today, 5)), to: endOfDay(today) };
  },
};
