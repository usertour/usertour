import { createZodDto } from 'nestjs-zod';

import { isUnambiguousIsoDate } from '@/common/filters';
import { z } from 'zod';

import { ApiObjectType } from '../shared/object-type';

/**
 * v2 content-analytics contracts. The GraphQL layer ships these breakdowns as
 * opaque JSON blobs (`viewsByDay` / `viewsByStep` / `viewsByTask` /
 * `viewsByBlock`, and the whole question-analytics payload); the public API
 * types them properly — that typing IS the feature.
 */

/**
 * Reject a non-IANA timezone at the boundary (400), not deep inside `fromZonedTime`
 * / the `AT TIME ZONE` SQL (which throw a RangeError / Postgres error → 500). Tests
 * the exact thing the runtime uses the zone for.
 */
const isValidTimeZone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// A calendar date (YYYY-MM-DD, interpreted in the `timezone` param) or an ISO
// timestamp WITH timezone. Timezone-less datetimes are rejected — they'd parse in
// the server's local zone and shift the range per deployment (shared rule with
// the list filters' isUnambiguousIsoDate).
const dateMsg = {
  message:
    'Not a valid date — use YYYY-MM-DD (interpreted in `timezone`) or an ISO timestamp WITH timezone.',
};

// Reusable analytics date/timezone fields — the SAME refines the MCP analytics
// tools use, so boundary validation (reject non-IANA zones and timezone-less
// datetimes) can't drift between the REST and MCP surfaces.
export const analyticsStartDate = z
  .string()
  .refine(isUnambiguousIsoDate, dateMsg)
  .optional()
  .describe('ISO date, inclusive. Default: 30 days ago.');
export const analyticsEndDate = z
  .string()
  .refine(isUnambiguousIsoDate, dateMsg)
  .optional()
  .describe('ISO date, inclusive. Default: today.');
export const analyticsTimezone = z
  .string()
  .refine(isValidTimeZone, {
    message: 'Not a valid IANA timezone (e.g. "UTC", "America/New_York", "Asia/Tokyo").',
  })
  .optional()
  .describe('IANA timezone used for the per-day bucketing. Default: UTC.');

export const analyticsQuery = z.object({
  environmentId: z
    .string()
    .describe('Environment whose sessions to aggregate (content is project-level; pick the env).'),
  startDate: analyticsStartDate,
  endDate: analyticsEndDate,
  timezone: analyticsTimezone,
});
export class AnalyticsQueryDto extends createZodDto(analyticsQuery) {}
export type AnalyticsQuery = z.infer<typeof analyticsQuery>;

/**
 * The response is a discriminated union on `contentType`: each content kind
 * reports the numbers it actually has, under their real names (a banner has
 * dismissals, not "completions"; a resource center has opens and clicks).
 * The uniform views/completions vocabulary is the dashboard's INTERNAL reuse
 * convenience — it does not leak into this contract.
 */

const int = () => z.number().int();

const analyticsBase = {
  object: z.literal(ApiObjectType.CONTENT_ANALYTICS),
  contentId: z.string(),
  environmentId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  timezone: z.string(),
};

const date = z.string().describe('ISO date (bucketed in the requested timezone).');

/**
 * The content-analytics day series is per-day INCREMENTS; the question-analytics
 * nps/rating byDay is rolling-window CUMULATIVE. Both describes spell out the
 * contrast — a charting consumer who assumes one convention silently draws the
 * wrong graph with the other.
 */
const dailySeries = <T extends z.ZodRawShape>(shape: T) =>
  z
    .array(z.object({ date, ...shape }))
    .describe(
      "Per-day activity: each row counts only that calendar day's events (increments — " +
        'summing rows over the range gives the totals). Note the question-analytics ' +
        'nps/rating byDay uses the OPPOSITE convention (rolling-window cumulative).',
    );

// unique* = distinct users in range; total* = events in range, repeats included.
const startsCompletions = {
  uniqueStarts: int(),
  totalStarts: int(),
  uniqueCompletions: int(),
  totalCompletions: int(),
};
const seenActivations = {
  uniqueSeen: int(),
  totalSeen: int(),
  uniqueActivations: int().describe('Distinct users who clicked (activated) the launcher.'),
  totalActivations: int(),
};
const seenDismissals = {
  uniqueSeen: int(),
  totalSeen: int(),
  uniqueDismissals: int().describe('Distinct users who closed the banner.'),
  totalDismissals: int(),
};
const opensClicks = {
  uniqueOpens: int(),
  totalOpens: int(),
  uniqueClicks: int().describe('Distinct users who clicked a block inside the panel.'),
  totalClicks: int(),
};
const usersOccurrences = {
  uniqueUsers: int().describe('Distinct users who fired the tracked event.'),
  totalOccurrences: int().describe('Occurrences of the tracked event.'),
};
const seenOnly = {
  uniqueSeen: int().describe(
    'Distinct users who saw the announcement (opened the feed listing it, or had its popup ' +
      'presented). Seen fires once per (user, announcement), so unique and total normally match.',
  ),
  totalSeen: int(),
};

/** Per-step funnel row — a step's own view/complete counts (semantics do not vary here). */
export const stepAnalytics = z.object({
  name: z.string(),
  cvid: z.string(),
  stepIndex: int(),
  type: z.string(),
  uniqueViews: int(),
  totalViews: int(),
  uniqueCompletions: int(),
  totalCompletions: int(),
  uniqueTooltipTargetMissing: int().describe(
    "Sessions where this tooltip step's target element was never found — the selector-health " +
      'signal. Only meaningful on tooltip steps; the field is present (and always 0) on other ' +
      'step types to keep rows uniform.',
  ),
  totalTooltipTargetMissing: int(),
});

/**
 * Per-task row. completions/clicks are the task's OWN counts (keyed by task id);
 * the view counts are NOT per-task — the domain aggregation counts whole-checklist
 * expansions (CHECKLIST_SEEN), so uniqueViews/totalViews repeat the same numbers
 * on every row. Truth-told in the field descriptions so API consumers don't read
 * identical rows as "every task equally viewed".
 */
export const taskAnalytics = z.object({
  name: z.string(),
  taskId: z.string(),
  uniqueViews: int().describe(
    'Times the CHECKLIST panel was expanded (unique users) — a whole-checklist count repeated on ' +
      'every task row, not this task’s own visibility.',
  ),
  totalViews: int().describe(
    'Whole-checklist expansions (all), repeated on every row — see uniqueViews.',
  ),
  uniqueCompletions: int(),
  totalCompletions: int(),
  uniqueClicks: int(),
  totalClicks: int(),
});

/** Per-block click row. */
export const blockAnalytics = z.object({
  name: z.string(),
  blockId: z.string(),
  tabName: z.string().nullable(),
  uniqueClicks: int(),
  totalClicks: int(),
});

export const flowAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('flow'),
  ...startsCompletions,
  uniqueCompletions: startsCompletions.uniqueCompletions.describe(
    'Distinct users who reached the end of the flow (or an explicit completion step).',
  ),
  byDay: dailySeries(startsCompletions),
  steps: z.array(stepAnalytics),
});

export const checklistAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('checklist'),
  ...startsCompletions,
  uniqueCompletions: startsCompletions.uniqueCompletions.describe(
    'Distinct users who completed every visible task.',
  ),
  byDay: dailySeries(startsCompletions),
  tasks: z.array(taskAnalytics),
});

export const launcherAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('launcher'),
  ...seenActivations,
  byDay: dailySeries(seenActivations),
});

export const bannerAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('banner'),
  ...seenDismissals,
  byDay: dailySeries(seenDismissals),
});

export const resourceCenterAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('resource-center'),
  ...opensClicks,
  byDay: dailySeries(opensClicks),
  blocks: z.array(blockAnalytics),
});

export const trackerAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('tracker'),
  ...usersOccurrences,
  byDay: dailySeries(usersOccurrences),
});

export const announcementAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('announcement'),
  ...seenOnly,
  byDay: dailySeries(seenOnly),
});

export const contentAnalytics = z.discriminatedUnion('contentType', [
  flowAnalytics,
  checklistAnalytics,
  launcherAnalytics,
  bannerAnalytics,
  resourceCenterAnalytics,
  trackerAnalytics,
  announcementAnalytics,
]);
export type ContentAnalytics = z.infer<typeof contentAnalytics>;

// A class cannot extend a union type, so the OpenAPI layer gets one DTO per
// variant; the controller stitches them together with oneOf + discriminator.
export class FlowAnalyticsDto extends createZodDto(flowAnalytics) {}
export class ChecklistAnalyticsDto extends createZodDto(checklistAnalytics) {}
export class LauncherAnalyticsDto extends createZodDto(launcherAnalytics) {}
export class BannerAnalyticsDto extends createZodDto(bannerAnalytics) {}
export class ResourceCenterAnalyticsDto extends createZodDto(resourceCenterAnalytics) {}
export class TrackerAnalyticsDto extends createZodDto(trackerAnalytics) {}
export class AnnouncementAnalyticsDto extends createZodDto(announcementAnalytics) {}

// ── question analytics (surveys) ─────────────────────────────────────────────

const share = z.object({ count: z.number().int(), percentage: z.number() });

const rollingWindowDays = z
  .number()
  .int()
  .describe(
    "Length in days of the trailing window each byDay row aggregates — the content's " +
      'configurable rolling-window setting (web analytics tab), default 365. Echoed here ' +
      'because the setting is per-content: without it a consumer cannot tell what a point ' +
      'in the series means.',
  );

const cumulativeSeriesNote =
  'Rolling-window CUMULATIVE series: each row aggregates the trailing `rollingWindowDays` ' +
  'ending on that date, so consecutive rows overlap and the LAST row equals the overall ' +
  'metrics. NOT per-day increments (daily deltas are not recoverable by differencing); the ' +
  'content-analytics byDay uses the opposite, per-day convention.';

const npsByDay = z
  .array(z.object({ date: z.string(), score: z.number(), total: z.number().int() }))
  .describe(cumulativeSeriesNote);
const ratingByDay = z
  .array(z.object({ date: z.string(), average: z.number(), total: z.number().int() }))
  .describe(cumulativeSeriesNote);

export const questionAnalytics = z.object({
  object: z.literal(ApiObjectType.QUESTION_ANALYTICS),
  /** Slim question reference — cvid is the stable analytics identity. */
  question: z.object({
    cvid: z.string(),
    name: z.string(),
    type: z.string(),
  }),
  totalResponses: z.number().int(),
  distribution: z
    .array(
      z.object({
        answer: z.union([z.string(), z.number()]),
        count: z.number().int(),
        percentage: z.number(),
      }),
    )
    .describe(
      'Overall answer distribution over the requested range. For choice questions EVERY ' +
        'configured option appears, in option order, with count 0 when nobody chose it — ' +
        'render it directly, no join against the version needed; answers recorded under ' +
        'options since removed from the question follow after. When answers are mutually ' +
        'exclusive (single select), the integer percentages are reconciled to sum to 100; ' +
        'multi-select percentages are per-option shares of respondents and may sum past 100.',
    ),
  /**
   * The nps/rating byDay rows are rolling-window CUMULATIVE (the opposite of the
   * content-analytics per-day series) — each carries `rollingWindowDays` so a
   * consumer can tell what a point means without knowing the content's settings.
   */
  nps: z
    .object({
      score: z
        .number()
        .describe(
          'ROLLING-WINDOW aggregate (the last byDay row) — computed over the trailing ' +
            '`rollingWindowDays`, NOT over the requested range. It therefore does not share a ' +
            'denominator with `totalResponses` (which IS range-scoped): promoter/passive/' +
            'detractor counts can legitimately dwarf it.',
        ),
      promoters: share.describe('Rolling-window share — same window as `score`, see its note.'),
      passives: share.describe('Rolling-window share — same window as `score`.'),
      detractors: share.describe('Rolling-window share — same window as `score`.'),
      rollingWindowDays: rollingWindowDays,
      byDay: npsByDay,
    })
    .nullable()
    .describe('NPS questions only.'),
  rating: z
    .object({
      average: z
        .number()
        .describe(
          'ROLLING-WINDOW average (the last byDay row) over the trailing `rollingWindowDays` — ' +
            'not scoped to the requested range like `totalResponses`.',
        ),
      rollingWindowDays: rollingWindowDays,
      byDay: ratingByDay,
    })
    .nullable()
    .describe('Star-rating / scale questions only.'),
});
export class QuestionAnalyticsDto extends createZodDto(questionAnalytics) {}
export type QuestionAnalytics = z.infer<typeof questionAnalytics>;

export const questionAnalyticsResponse = z.object({
  results: z
    .array(questionAnalytics)
    .describe(
      'One entry per aggregable question (nps / rating / choice). Free-text questions ' +
        '(single/multi-line text) are omitted entirely — no aggregate signal for open text. ' +
        'To read raw answers (including free text), fetch sessions for this content with ' +
        'answers expanded.',
    ),
});
export class QuestionAnalyticsResponseDto extends createZodDto(questionAnalyticsResponse) {}
