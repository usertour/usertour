import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ApiObjectType } from '../shared/object-type';

/**
 * v2 content-analytics contracts. The GraphQL layer ships these breakdowns as
 * opaque JSON blobs (`viewsByDay` / `viewsByStep` / `viewsByTask` /
 * `viewsByBlock`, and the whole question-analytics payload); the public API
 * types them properly — that typing IS the feature.
 */

export const analyticsQuery = z.object({
  environmentId: z
    .string()
    .describe('Environment whose sessions to aggregate (content is project-level; pick the env).'),
  startDate: z.string().optional().describe('ISO date, inclusive. Default: 30 days ago.'),
  endDate: z.string().optional().describe('ISO date, inclusive. Default: today.'),
  timezone: z
    .string()
    .optional()
    .describe('IANA timezone used for the per-day bucketing. Default: UTC.'),
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
  /** Sessions where this tooltip step's target element was never found — the selector-health signal. */
  uniqueTooltipTargetMissing: int(),
  totalTooltipTargetMissing: int(),
});

/** Per-task row — the task's own view/complete/click counts. */
export const taskAnalytics = z.object({
  name: z.string(),
  taskId: z.string(),
  uniqueViews: int(),
  totalViews: int(),
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
  byDay: z.array(z.object({ date, ...startsCompletions })),
  steps: z.array(stepAnalytics),
});

export const checklistAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('checklist'),
  ...startsCompletions,
  uniqueCompletions: startsCompletions.uniqueCompletions.describe(
    'Distinct users who completed every visible task.',
  ),
  byDay: z.array(z.object({ date, ...startsCompletions })),
  tasks: z.array(taskAnalytics),
});

export const launcherAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('launcher'),
  ...seenActivations,
  byDay: z.array(z.object({ date, ...seenActivations })),
});

export const bannerAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('banner'),
  ...seenDismissals,
  byDay: z.array(z.object({ date, ...seenDismissals })),
});

export const resourceCenterAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('resource-center'),
  ...opensClicks,
  byDay: z.array(z.object({ date, ...opensClicks })),
  blocks: z.array(blockAnalytics),
});

export const trackerAnalytics = z.object({
  ...analyticsBase,
  contentType: z.literal('tracker'),
  ...usersOccurrences,
  byDay: z.array(z.object({ date, ...usersOccurrences })),
});

export const contentAnalytics = z.discriminatedUnion('contentType', [
  flowAnalytics,
  checklistAnalytics,
  launcherAnalytics,
  bannerAnalytics,
  resourceCenterAnalytics,
  trackerAnalytics,
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

// ── question analytics (surveys) ─────────────────────────────────────────────

const share = z.object({ count: z.number().int(), percentage: z.number() });

export const questionAnalytics = z.object({
  object: z.literal(ApiObjectType.QUESTION_ANALYTICS),
  /** Slim question reference — cvid is the stable analytics identity. */
  question: z.object({
    cvid: z.string(),
    name: z.string(),
    type: z.string(),
  }),
  totalResponses: z.number().int(),
  /** Overall answer distribution over the (rolling-window) range. */
  distribution: z.array(
    z.object({
      answer: z.union([z.string(), z.number()]),
      count: z.number().int(),
      percentage: z.number(),
    }),
  ),
  /** NPS questions only. */
  nps: z
    .object({
      score: z.number(),
      promoters: share,
      passives: share,
      detractors: share,
      byDay: z.array(z.object({ date: z.string(), score: z.number(), total: z.number().int() })),
    })
    .nullable(),
  /** Star-rating / scale questions only. */
  rating: z
    .object({
      average: z.number(),
      byDay: z.array(z.object({ date: z.string(), average: z.number(), total: z.number().int() })),
    })
    .nullable(),
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
