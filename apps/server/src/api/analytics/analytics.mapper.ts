import { ContentDataType } from '@usertour/types';

import { ApiObjectType } from '../shared/object-type';
import type { ContentAnalytics, QuestionAnalytics } from './analytics.schema';

/**
 * Pure domain -> API mapping (no DI, unit-testable). The domain service returns
 * loosely-shaped objects (the GraphQL layer exposes them as opaque JSON); the
 * mapper normalizes them into the typed v2 contract:
 * - the per-type breakdown lands in exactly one of steps/tasks/blocks, gated by
 *   the CONTENT TYPE (the domain signals "not applicable" inconsistently:
 *   `false`, `null`, or `[]` depending on the code path);
 * - Date objects become ISO dates;
 * - step tooltip-target-missing counters lose their internal `...Count` suffix.
 */

const isoDate = (value: unknown): string => {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
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
  const byDay = Array.isArray(raw?.viewsByDay)
    ? // biome-ignore lint/suspicious/noExplicitAny: see above
      raw.viewsByDay.map((day: any) => ({ date: isoDate(day.date), ...counts(day) }))
    : [];

  const steps =
    meta.contentType === ContentDataType.FLOW && Array.isArray(raw?.viewsByStep)
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
      : null;

  const tasks =
    meta.contentType === ContentDataType.CHECKLIST && Array.isArray(raw?.viewsByTask)
      ? // biome-ignore lint/suspicious/noExplicitAny: see above
        raw.viewsByTask.map((row: any) => ({
          name: String(row.name ?? ''),
          taskId: String(row.taskId ?? ''),
          ...counts(row.analytics),
          uniqueClicks: int(row.analytics?.uniqueClicks),
          totalClicks: int(row.analytics?.totalClicks),
        }))
      : null;

  const blocks =
    meta.contentType === ContentDataType.RESOURCE_CENTER && Array.isArray(raw?.viewsByBlock)
      ? // biome-ignore lint/suspicious/noExplicitAny: see above
        raw.viewsByBlock.map((row: any) => ({
          name: String(row.name ?? ''),
          blockId: String(row.blockId ?? ''),
          tabName: row.tabName != null ? String(row.tabName) : null,
          uniqueClicks: int(row.analytics?.uniqueClicks),
          totalClicks: int(row.analytics?.totalClicks),
        }))
      : null;

  return {
    object: ApiObjectType.CONTENT_ANALYTICS,
    contentId: meta.contentId,
    environmentId: meta.environmentId,
    startDate: meta.startDate,
    endDate: meta.endDate,
    timezone: meta.timezone,
    ...counts(raw),
    byDay,
    steps,
    tasks,
    blocks,
  };
}

const share = (raw: { count?: number; percentage?: number } | undefined) => ({
  count: int(raw?.count),
  percentage: typeof raw?.percentage === 'number' ? raw.percentage : 0,
});

// biome-ignore lint/suspicious/noExplicitAny: domain analytics payloads are untyped JSON
export function mapQuestionAnalytics(rawList: any[]): QuestionAnalytics[] {
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
              date: isoDate(day.day),
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
              date: isoDate(day.day),
              average: typeof day?.metrics?.average === 'number' ? day.metrics.average : 0,
              total: int(day?.metrics?.total),
            })),
          }
        : null,
    };
  });
}
