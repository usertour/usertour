import { ContentDataType } from '@usertour/types';
import { formatInTimeZone } from 'date-fns-tz';

import { ApiObjectType } from '../shared/object-type';
import type { ContentAnalytics, QuestionAnalytics } from './analytics.schema';

/**
 * Pure domain -> API mapping (no DI, unit-testable). The domain service returns
 * loosely-shaped objects under a uniform internal views/completions vocabulary
 * (each content type maps those to a different event pair); the mapper renames
 * them to the per-type contract variant — starts/completions, seen/dismissals,
 * opens/clicks, users/occurrences — so the public field names say what is
 * actually counted. Date objects become ISO dates; step tooltip-target-missing
 * counters lose their internal `...Count` suffix.
 */

/** Day label in the REQUESTED timezone — a UTC slice would shift the label a day for eastern-timezone requests. */
const dayLabelIn = (timezone: string, value: unknown): string => {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : formatInTimeZone(date, timezone, 'yyyy-MM-dd');
};

const int = (value: unknown): number => (typeof value === 'number' ? Math.trunc(value) : 0);

type RawCounts = {
  uniqueViews?: number;
  totalViews?: number;
  uniqueCompletions?: number;
  totalCompletions?: number;
};

const counts = (raw: RawCounts | undefined) => ({
  uniqueViews: int(raw?.uniqueViews),
  totalViews: int(raw?.totalViews),
  uniqueCompletions: int(raw?.uniqueCompletions),
  totalCompletions: int(raw?.totalCompletions),
});

// Per-variant renames of the domain's internal views/completions counters.
const startsCompletions = (c: ReturnType<typeof counts>) => ({
  uniqueStarts: c.uniqueViews,
  totalStarts: c.totalViews,
  uniqueCompletions: c.uniqueCompletions,
  totalCompletions: c.totalCompletions,
});
const seenActivations = (c: ReturnType<typeof counts>) => ({
  uniqueSeen: c.uniqueViews,
  totalSeen: c.totalViews,
  uniqueActivations: c.uniqueCompletions,
  totalActivations: c.totalCompletions,
});
const seenDismissals = (c: ReturnType<typeof counts>) => ({
  uniqueSeen: c.uniqueViews,
  totalSeen: c.totalViews,
  uniqueDismissals: c.uniqueCompletions,
  totalDismissals: c.totalCompletions,
});
const opensClicks = (c: ReturnType<typeof counts>) => ({
  uniqueOpens: c.uniqueViews,
  totalOpens: c.totalViews,
  uniqueClicks: c.uniqueCompletions,
  totalClicks: c.totalCompletions,
});
// Tracker "completions" mirror views in the domain — fake data, not surfaced.
const usersOccurrences = (c: ReturnType<typeof counts>) => ({
  uniqueUsers: c.uniqueViews,
  totalOccurrences: c.totalViews,
});
// Announcements have ONE signal (SEEN, once per user); the domain runs them
// through the tracker-style event aggregation, whose "completions" mirror views.
const seenOnly = (c: ReturnType<typeof counts>) => ({
  uniqueSeen: c.uniqueViews,
  totalSeen: c.totalViews,
});

export interface AnalyticsMeta {
  contentId: string;
  contentType: string;
  environmentId: string;
  startDate: string;
  endDate: string;
  timezone: string;
}

// biome-ignore lint/suspicious/noExplicitAny: domain analytics payloads are untyped JSON
export function mapContentAnalytics(raw: any, meta: AnalyticsMeta): ContentAnalytics {
  const base = {
    object: ApiObjectType.CONTENT_ANALYTICS as const,
    contentId: meta.contentId,
    environmentId: meta.environmentId,
    startDate: meta.startDate,
    endDate: meta.endDate,
    timezone: meta.timezone,
  };
  const top = counts(raw);
  const days: { date: string; counts: ReturnType<typeof counts> }[] = Array.isArray(raw?.viewsByDay)
    ? // biome-ignore lint/suspicious/noExplicitAny: see above
      raw.viewsByDay.map((day: any) => ({
        date: dayLabelIn(meta.timezone, day.date),
        counts: counts(day),
      }))
    : [];
  const byDay = <T extends object>(rename: (c: ReturnType<typeof counts>) => T) =>
    days.map((day) => ({ date: day.date, ...rename(day.counts) }));

  switch (meta.contentType) {
    case ContentDataType.FLOW:
      return {
        ...base,
        contentType: 'flow',
        ...startsCompletions(top),
        byDay: byDay(startsCompletions),
        steps: Array.isArray(raw?.viewsByStep)
          ? // biome-ignore lint/suspicious/noExplicitAny: see above
            raw.viewsByStep.map((row: any) => ({
              name: String(row.name ?? ''),
              cvid: String(row.cvid ?? ''),
              stepIndex: int(row.stepIndex),
              type: String(row.type ?? ''),
              ...counts(row.analytics),
              uniqueTooltipTargetMissing: int(row.analytics?.uniqueTooltipTargetMissingCount),
              totalTooltipTargetMissing: int(row.analytics?.tooltipTargetMissingCount),
            }))
          : [],
      };
    case ContentDataType.CHECKLIST:
      return {
        ...base,
        contentType: 'checklist',
        ...startsCompletions(top),
        byDay: byDay(startsCompletions),
        tasks: Array.isArray(raw?.viewsByTask)
          ? // biome-ignore lint/suspicious/noExplicitAny: see above
            raw.viewsByTask.map((row: any) => ({
              name: String(row.name ?? ''),
              taskId: String(row.taskId ?? ''),
              ...counts(row.analytics),
              uniqueClicks: int(row.analytics?.uniqueClicks),
              totalClicks: int(row.analytics?.totalClicks),
            }))
          : [],
      };
    case ContentDataType.LAUNCHER:
      return {
        ...base,
        contentType: 'launcher',
        ...seenActivations(top),
        byDay: byDay(seenActivations),
      };
    case ContentDataType.BANNER:
      return {
        ...base,
        contentType: 'banner',
        ...seenDismissals(top),
        byDay: byDay(seenDismissals),
      };
    case ContentDataType.RESOURCE_CENTER:
      return {
        ...base,
        contentType: 'resource-center',
        ...opensClicks(top),
        byDay: byDay(opensClicks),
        blocks: Array.isArray(raw?.viewsByBlock)
          ? // biome-ignore lint/suspicious/noExplicitAny: see above
            raw.viewsByBlock.map((row: any) => ({
              name: String(row.name ?? ''),
              blockId: String(row.blockId ?? ''),
              tabName: row.tabName != null ? String(row.tabName) : null,
              uniqueClicks: int(row.analytics?.uniqueClicks),
              totalClicks: int(row.analytics?.totalClicks),
            }))
          : [],
      };
    case ContentDataType.TRACKER:
      return {
        ...base,
        contentType: 'tracker',
        ...usersOccurrences(top),
        byDay: byDay(usersOccurrences),
      };
    case ContentDataType.ANNOUNCEMENT:
      return {
        ...base,
        contentType: 'announcement',
        ...seenOnly(top),
        byDay: byDay(seenOnly),
      };
    default:
      // Unreachable for v2 content (every V2_CONTENT_TYPES member has a case
      // above); kept as a guard for future types so a gap fails loudly in tests
      // rather than shipping a silent wrong shape.
      throw new Error(`Unsupported content type for analytics: ${meta.contentType}`);
  }
}

const share = (raw: { count?: number; percentage?: number } | undefined) => ({
  count: int(raw?.count),
  percentage: typeof raw?.percentage === 'number' ? raw.percentage : 0,
});

/**
 * The domain's rolling-series `day` is the first instant of that calendar day
 * in the REQUESTED timezone — label it with the same timezone (a UTC slice
 * would shift the label a day for eastern-timezone requests).
 */
// biome-ignore lint/suspicious/noExplicitAny: domain analytics payloads are untyped JSON
export function mapQuestionAnalytics(rawList: any[], timezone: string): QuestionAnalytics[] {
  const dayLabel = (value: unknown): string => dayLabelIn(timezone, value);
  return (rawList ?? []).map((raw) => {
    const question = raw?.question ?? {};
    const npsDays: unknown[] | null = Array.isArray(raw?.npsAnalysisByDay)
      ? raw.npsAnalysisByDay
      : null;
    const ratingDays: unknown[] | null = Array.isArray(raw?.averageByDay) ? raw.averageByDay : null;
    // The rolling-window series' LAST day carries the current overall metrics.
    // biome-ignore lint/suspicious/noExplicitAny: see above
    const lastNps: any = npsDays?.[npsDays.length - 1];
    // biome-ignore lint/suspicious/noExplicitAny: see above
    const lastRating: any = ratingDays?.[ratingDays.length - 1];

    return {
      object: ApiObjectType.QUESTION_ANALYTICS,
      question: {
        cvid: String(question?.data?.cvid ?? ''),
        name: String(question?.data?.name ?? ''),
        type: String(question?.type ?? ''),
      },
      totalResponses: int(raw?.totalResponse),
      // biome-ignore lint/suspicious/noExplicitAny: see above
      distribution: (Array.isArray(raw?.answer) ? raw.answer : []).map((entry: any) => ({
        answer: entry?.answer ?? '',
        count: int(entry?.count),
        percentage: typeof entry?.percentage === 'number' ? entry.percentage : 0,
      })),
      nps: npsDays
        ? {
            score: typeof lastNps?.metrics?.npsScore === 'number' ? lastNps.metrics.npsScore : 0,
            promoters: share(lastNps?.metrics?.promoters),
            passives: share(lastNps?.metrics?.passives),
            detractors: share(lastNps?.metrics?.detractors),
            // biome-ignore lint/suspicious/noExplicitAny: see above
            byDay: npsDays.map((day: any) => ({
              date: dayLabel(day.day),
              score: typeof day?.metrics?.npsScore === 'number' ? day.metrics.npsScore : 0,
              total: int(day?.metrics?.total),
            })),
          }
        : null,
      rating: ratingDays
        ? {
            average:
              typeof lastRating?.metrics?.average === 'number' ? lastRating.metrics.average : 0,
            // biome-ignore lint/suspicious/noExplicitAny: see above
            byDay: ratingDays.map((day: any) => ({
              date: dayLabel(day.day),
              average: typeof day?.metrics?.average === 'number' ? day.metrics.average : 0,
              total: int(day?.metrics?.total),
            })),
          }
        : null,
    };
  });
}
