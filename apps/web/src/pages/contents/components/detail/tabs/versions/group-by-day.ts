import { format, isToday, isYesterday } from 'date-fns';
import type { TFunction } from 'i18next';

export type DayGroup<T> = { key: string; label: string; items: T[] };

/**
 * Group a (already sorted) list into per-day buckets labeled Today / Yesterday /
 * a "PP"-formatted date. Shared by the version-history and publish-history tabs
 * so their grouping/labels can't drift apart.
 */
export const groupByDay = <T>(
  items: T[],
  getDate: (item: T) => Date,
  t: TFunction,
): DayGroup<T>[] => {
  const groups = new Map<string, DayGroup<T>>();
  for (const item of items) {
    const date = getDate(item);
    const key = format(date, 'yyyy-MM-dd');
    let label: string;
    if (isToday(date)) label = t('contents.versions.group.today');
    else if (isYesterday(date)) label = t('contents.versions.group.yesterday');
    else label = format(date, 'PP');

    const existing = groups.get(key);
    if (existing) existing.items.push(item);
    else groups.set(key, { key, label, items: [item] });
  }
  return Array.from(groups.values());
};
