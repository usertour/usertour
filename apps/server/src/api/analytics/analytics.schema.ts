import { createZodDto } from 'nestjs-zod';

import { isUnambiguousIsoDate } from '@/common/filters';
import { z } from 'zod';
import { questionTypeEnum, stepTypeEnum } from '../content-representation/representation.schema';

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

const int = () => z.number().int().min(0);

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
 * The content-analytics day series is per-day rows (increments or first-touch,
 * spelled out per type below); the question-analytics nps/rating byDay is
 * rolling-window CUMULATIVE. The describes spell out the contrast — a charting
 * consumer who assumes one convention silently draws the wrong graph with the
 * other.
 */
const dailySeries = <T extends z.ZodRawShape>(shape: T, description: string) =>
  z.array(z.object({ date, ...shape })).describe(description);

/** flow / checklist / resource-center / tracker byDay: per-day increments. */
const incrementSeriesNote =
  'Per-day activity: each row counts only that calendar day (increments, NOT a running ' +
  'total). Summing the `total*` rows reproduces the `total*` headline; a `unique*` row is ' +
  'distinct users WITHIN THAT DAY, so summing `unique*` rows over-counts a user active on ' +
  'several days — there is no daily series for range-wide unique users. Note the ' +
  'question-analytics nps/rating byDay uses the OPPOSITE convention (rolling-window ' +
  'cumulative).';

/** launcher / banner / announcement byDay: per-day FIRST-TOUCH rows. */
const firstTouchSeriesNote =
  'Per-day FIRST-TOUCH activity: each row counts the users whose first event of that kind ' +
  'fell on that calendar day. A user appears on exactly one day, so rows never double-count ' +
  'and summing them equals the range headline. Note the question-analytics nps/rating byDay ' +
  'uses a different convention (rolling-window cumulative).';

/**
 * Counting rules — each field's describe is the contract, but the shape is
 * deliberate: `unique*` always counts distinct USERS in the range. What
 * `total*` counts depends on the content type's session shape:
 * - flow/checklist starts+completions: RUNS (one session = one run-through,
 *   so "times started" is the session count — a user who ran it twice counts
 *   twice).
 * - panel opens (resource-center total*, checklist totalOpens): EVENTS — an
 *   expansion repeats within one session, so only raw events answer "how many
 *   times", and (for RC) they reconcile with the per-block rows.
 * - tracker/announcement: EVENTS.
 * - launcher/banner: NO totals — their events fire once per user (lifetime
 *   single session), so a range scopes every metric to users NEW in it and a
 *   total would only repeat the unique count.
 */
const startsCompletions = {
  uniqueStarts: int().describe('Distinct users who started it in the range.'),
  totalStarts: int().describe(
    'Runs started in the range — one per session, so a user who ran it twice counts twice.',
  ),
  uniqueCompletions: int(),
  totalCompletions: int().describe('Runs completed in the range.'),
};
const launcherCounts = {
  uniqueSeen: int().describe(
    'Distinct users whose launcher FIRST appeared in the range. The seen event fires once ' +
      'per user (at first display; a launcher has one lifetime session), so a range counts ' +
      'users NEWLY reached in it — a user first reached before the range does not appear ' +
      'here no matter how often they still see the launcher.',
  ),
  newActivations: int().describe(
    'Distinct users whose FIRST-EVER activation (click / hover, per the launcher setting) ' +
      'fell in the range. Later activations never re-count a user, so this pairs with ' +
      'uniqueSeen as a first-touch funnel. A user first reached in an earlier range who ' +
      'first activates now counts here but not in uniqueSeen, so per-range ' +
      'newActivations/uniqueSeen can exceed 1; over an all-time range it cannot.',
  ),
};
const bannerCounts = {
  uniqueSeen: int().describe(
    'Distinct users whose banner FIRST appeared in the range — the seen event fires once ' +
      'per user (lifetime single session), so a range counts users newly reached in it, ' +
      'not users who merely still had it on screen.',
  ),
  uniqueDismissals: int().describe(
    'Distinct users who dismissed the banner in the range (a dismissal happens at most ' +
      'once per user).',
  ),
};
const opensClicks = {
  uniqueOpens: int().describe('Distinct users who expanded the panel in the range.'),
  totalOpens: int().describe(
    'Panel expansions in the range — every expansion counts, so repeats by the same user ' +
      'add up.',
  ),
  uniqueClicks: int().describe('Distinct users who clicked a block inside the panel.'),
  totalClicks: int().describe(
    'Block-click events in the range (repeats included). Normally equals the sum of the ' +
      "block rows' totalClicks; it can exceed that sum when clicks were recorded on blocks " +
      'since removed from the published version.',
  ),
};
const usersOccurrences = {
  uniqueUsers: int().describe('Distinct users who fired the tracked event.'),
  totalOccurrences: int().describe('Occurrences of the tracked event (repeats included).'),
};
const seenOnly = {
  uniqueSeen: int().describe(
    'Distinct users who saw the announcement (opened the feed listing it, or had its popup ' +
      'presented). Seen fires once per (user, announcement) — repeat views never add.',
  ),
};

/**
 * Per-step funnel row. Views are the step's own; the completion counts are NOT
 * per-step progress — the flow's completion event carries the cvid of the step it
 * fired on, so completions land entirely on ONE row (the last step, or an explicit
 * completion step) and every earlier step legitimately reads 0. Spelled out in the
 * field descriptions so a funnel reader does not compute "0% step conversion".
 */
export const stepAnalytics = z.object({
  name: z.string(),
  cvid: z.string(),
  stepIndex: int(),
  type: stepTypeEnum,
  uniqueViews: int().describe(
    'Distinct users who saw this step. This is the funnel: step-to-step drop-off is the ' +
      'difference between consecutive rows’ uniqueViews.',
  ),
  totalViews: int().describe(
    'Runs in which this step was shown (re-visits within one run do not add).',
  ),
  uniqueCompletions: int().describe(
    'Distinct users whose FLOW completion fired on this step — not "users who advanced past ' +
      'it". Normally 0 on every step but the last (or an explicit completion step); a 0 here ' +
      'says nothing about that step’s success. Use uniqueViews for step conversion.',
  ),
  totalCompletions: int().describe(
    'Flow completions attributed to this step — see uniqueCompletions.',
  ),
  uniqueTooltipTargetMissing: int().describe(
    "Distinct users for whom this tooltip step's target element was never found — the " +
      'selector-health signal. Only meaningful on tooltip steps; the field is present (and ' +
      'always 0) on other step types to keep rows uniform.',
  ),
  totalTooltipTargetMissing: int().describe('Runs in which the target element was never found.'),
});

/**
 * Per-task row — ONLY the task's own counts (keyed by task id). There is no
 * per-task view event, so no per-task denominator is shipped; rate against the
 * headline uniqueOpens (panel opens), minding its completion caveat.
 */
export const taskAnalytics = z.object({
  name: z.string(),
  taskId: z
    .string()
    .describe(
      "The task's stable identity — equals the checklist definition's `data.items[].id` on the " +
        'version; join on it to pair analytics rows with task definitions.',
    ),
  uniqueCompletions: int().describe('Distinct users who completed this task.'),
  totalCompletions: int().describe('Runs in which this task was completed.'),
  uniqueClicks: int().describe('Distinct users who clicked this task.'),
  totalClicks: int().describe('Task-click events (repeats included).'),
});

/** Per-block click row. */
export const blockAnalytics = z.object({
  name: z.string(),
  blockId: z.string(),
  tabId: z
    .string()
    .describe(
      "The tab's stable identity — group block rows by it (tabName can be null or " +
        'duplicated across tabs).',
    ),
  tabName: z.string().nullable(),
  uniqueClicks: int().describe('Distinct users who clicked this block.'),
  totalClicks: int().describe('Click events on this block (repeats included).'),
});

export const flowAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('flow'),
  ...startsCompletions,
  uniqueCompletions: startsCompletions.uniqueCompletions.describe(
    'Distinct users who reached the end of the flow (or an explicit completion step).',
  ),
  byDay: dailySeries(startsCompletions, incrementSeriesNote),
  steps: z.array(stepAnalytics),
});

export const checklistAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('checklist'),
  ...startsCompletions,
  uniqueCompletions: startsCompletions.uniqueCompletions.describe(
    'Distinct users who completed every visible task.',
  ),
  // Panel-open pair — same vocabulary and semantics as the resource-center's.
  uniqueOpens: int().describe(
    'Distinct users who expanded the checklist panel in the range — the denominator for ' +
      'per-task click/completion rates. Caveat: completion conditions evaluate regardless of ' +
      'expansion or task visibility (a condition-driven task completes for users who never ' +
      'opened the panel), so only click-completed tasks form a true funnel against this.',
  ),
  totalOpens: int().describe(
    'Panel expansions in the range — every expansion counts, so repeats by the same user add up.',
  ),
  byDay: dailySeries(
    { ...startsCompletions, uniqueOpens: int(), totalOpens: int() },
    incrementSeriesNote,
  ),
  tasks: z.array(taskAnalytics),
});

export const launcherAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('launcher'),
  ...launcherCounts,
  byDay: dailySeries(launcherCounts, firstTouchSeriesNote),
});

export const bannerAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('banner'),
  ...bannerCounts,
  byDay: dailySeries(bannerCounts, firstTouchSeriesNote),
});

export const resourceCenterAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('resource-center'),
  ...opensClicks,
  byDay: dailySeries(opensClicks, incrementSeriesNote),
  blocks: z.array(blockAnalytics),
});

export const trackerAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('tracker'),
  ...usersOccurrences,
  byDay: dailySeries(usersOccurrences, incrementSeriesNote),
});

export const announcementAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('announcement'),
  ...seenOnly,
  byDay: dailySeries(seenOnly, firstTouchSeriesNote),
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

const share = z.object({
  count: z.number().int(),
  percentage: z.number().describe('0-100 (not 0-1).'),
});

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
    type: questionTypeEnum,
  }),
  totalResponses: z.number().int(),
  distribution: z
    .array(
      z.object({
        answer: z.union([z.string(), z.number()]),
        count: z.number().int(),
        percentage: z.number().describe('0-100 (not 0-1).'),
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
