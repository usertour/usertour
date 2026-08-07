import { ContentDataType, ContentEditorElementType } from '@usertour/types';
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
// Launcher/banner expose ONLY the first-touch user counts: their seen event
// fires once per user (lifetime single session), so the session-distinct
// totals the domain computes always repeat the unique numbers — dropped from
// the contract rather than shipped as fake information. The launcher's
// activation counter is first-ever-activation-in-range (paired with the
// first-touch denominator), named newActivations so the name says so.
const launcherCounts = (c: ReturnType<typeof counts>) => ({
  uniqueSeen: c.uniqueViews,
  newActivations: c.uniqueCompletions,
});
const bannerCounts = (c: ReturnType<typeof counts>) => ({
  uniqueSeen: c.uniqueViews,
  uniqueDismissals: c.uniqueCompletions,
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
// through the tracker-style event aggregation, whose "completions" mirror
// views. The event total always equals the unique count (first-seen-only
// writes), so only uniqueSeen is exposed.
const seenOnly = (c: ReturnType<typeof counts>) => ({
  uniqueSeen: c.uniqueViews,
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
        // Panel-open pair (RC-shaped). The domain's per-task view counters are
        // whole-checklist numbers repeated on every row — dropped from the task
        // rows; the honest checklist-level number ships here instead.
        uniqueOpens: int(raw?.uniqueOpens),
        totalOpens: int(raw?.totalOpens),
        // biome-ignore lint/suspicious/noExplicitAny: see above
        byDay: days.map((day, i) => ({
          date: day.date,
          ...startsCompletions(day.counts),
          uniqueOpens: int((raw?.viewsByDay?.[i] as any)?.uniqueOpens),
          totalOpens: int((raw?.viewsByDay?.[i] as any)?.totalOpens),
        })),
        tasks: Array.isArray(raw?.viewsByTask)
          ? // biome-ignore lint/suspicious/noExplicitAny: see above
            raw.viewsByTask.map((row: any) => ({
              name: String(row.name ?? ''),
              taskId: String(row.taskId ?? ''),
              uniqueCompletions: int(row.analytics?.uniqueCompletions),
              totalCompletions: int(row.analytics?.totalCompletions),
              uniqueClicks: int(row.analytics?.uniqueClicks),
              totalClicks: int(row.analytics?.totalClicks),
            }))
          : [],
      };
    case ContentDataType.LAUNCHER:
      return {
        ...base,
        contentType: 'launcher',
        ...launcherCounts(top),
        byDay: byDay(launcherCounts),
      };
    case ContentDataType.BANNER:
      return {
        ...base,
        contentType: 'banner',
        ...bannerCounts(top),
        byDay: byDay(bannerCounts),
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
              tabId: String(row.tabId ?? ''),
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

/** Per-question-kind rolling-window lengths (days) the domain aggregated with. */
export interface QuestionRollingWindows {
  nps: number;
  rate: number;
  scale: number;
}

type DistributionCount = { answer: string | number; count: number };

/**
 * Build the distribution rows. For a choice question every configured option
 * appears, in option order, count 0 when nobody chose it — the same join the
 * dashboard does client-side against `question.data.options`, done HERE because
 * an API consumer has no version at hand to join against. Answers recorded
 * under options since removed from the question keep their own rows after the
 * configured ones (NOT collapsed into an "Other" bucket — that is the
 * dashboard's lossy display choice; a data API keeps the values).
 */
// biome-ignore lint/suspicious/noExplicitAny: domain analytics payloads are untyped JSON
const distributionCounts = (raw: any): DistributionCount[] => {
  // biome-ignore lint/suspicious/noExplicitAny: see above
  const recorded: any[] = Array.isArray(raw?.answer) ? raw.answer : [];
  // biome-ignore lint/suspicious/noExplicitAny: see above
  const options: any[] = Array.isArray(raw?.question?.data?.options)
    ? raw.question.data.options
    : [];
  const rows = recorded.map((e) => ({ answer: e?.answer ?? '', count: int(e?.count) }));
  if (options.length === 0) {
    return rows;
  }
  const byValue = new Map(rows.map((row) => [String(row.answer), row]));
  const optionValues = new Set(options.map((o) => String(o?.value ?? '')));
  return [
    ...options.map(
      (o) => byValue.get(String(o?.value ?? '')) ?? { answer: o?.value ?? '', count: 0 },
    ),
    ...rows.filter((row) => !optionValues.has(String(row.answer))),
  ];
};

/**
 * Integer percentages. When the counts are mutually exclusive (they sum to
 * totalResponses — single select), largest-remainder rounding makes them sum to
 * exactly 100 (33/33/33 → 34/33/33). Multi-select counts overlap respondents,
 * so each stays an independent share of respondents (plain rounding, the
 * domain's own formula) and the sum may legitimately pass 100.
 */
const withPercentages = (rows: DistributionCount[], total: number) => {
  if (total <= 0) {
    return rows.map((row) => ({ ...row, percentage: 0 }));
  }
  if (rows.reduce((sum, row) => sum + row.count, 0) !== total) {
    return rows.map((row) => ({ ...row, percentage: Math.round((row.count / total) * 100) }));
  }
  const exact = rows.map((row) => (row.count * 100) / total);
  const floors = exact.map(Math.floor);
  let leftover = 100 - floors.reduce((sum, v) => sum + v, 0);
  const byRemainder = exact
    .map((value, i) => ({ frac: value - floors[i], count: rows[i].count, i }))
    .sort((a, b) => b.frac - a.frac || b.count - a.count || a.i - b.i);
  for (const { i } of byRemainder) {
    if (leftover <= 0) break;
    floors[i] += 1;
    leftover -= 1;
  }
  return rows.map((row, i) => ({ ...row, percentage: floors[i] }));
};

/**
 * The domain's rolling-series `day` is the first instant of that calendar day
 * in the REQUESTED timezone — label it with the same timezone (a UTC slice
 * would shift the label a day for eastern-timezone requests).
 */
// biome-ignore lint/suspicious/noExplicitAny: domain analytics payloads are untyped JSON
export function mapQuestionAnalytics(
  // biome-ignore lint/suspicious/noExplicitAny: see above
  rawList: any[],
  timezone: string,
  windows: QuestionRollingWindows,
): QuestionAnalytics[] {
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
        type: String(question?.type ?? '') as QuestionAnalytics['question']['type'],
      },
      totalResponses: int(raw?.totalResponse),
      distribution: withPercentages(distributionCounts(raw), int(raw?.totalResponse)),
      nps: npsDays
        ? {
            score: typeof lastNps?.metrics?.npsScore === 'number' ? lastNps.metrics.npsScore : 0,
            promoters: share(lastNps?.metrics?.promoters),
            passives: share(lastNps?.metrics?.passives),
            detractors: share(lastNps?.metrics?.detractors),
            rollingWindowDays: windows.nps,
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
            rollingWindowDays:
              String(question?.type) === ContentEditorElementType.SCALE
                ? windows.scale
                : windows.rate,
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
