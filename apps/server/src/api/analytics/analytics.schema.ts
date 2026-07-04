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

const counts = {
  uniqueViews: z.number().int(),
  totalViews: z.number().int(),
  uniqueCompletions: z.number().int(),
  totalCompletions: z.number().int(),
};

export const analyticsByDay = z.object({
  date: z.string().describe('ISO date (bucketed in the requested timezone).'),
  ...counts,
});

/** Per-step funnel row — flows only. */
export const stepAnalytics = z.object({
  name: z.string(),
  cvid: z.string(),
  stepIndex: z.number().int(),
  type: z.string(),
  ...counts,
  /** Sessions where this tooltip step's target element was never found — the selector-health signal. */
  uniqueTooltipTargetMissing: z.number().int(),
  totalTooltipTargetMissing: z.number().int(),
});

/** Per-task row — checklists only. */
export const taskAnalytics = z.object({
  name: z.string(),
  taskId: z.string(),
  ...counts,
  uniqueClicks: z.number().int(),
  totalClicks: z.number().int(),
});

/** Per-block click row — resource centers only. */
export const blockAnalytics = z.object({
  name: z.string(),
  blockId: z.string(),
  tabName: z.string().nullable(),
  uniqueClicks: z.number().int(),
  totalClicks: z.number().int(),
});

export const contentAnalytics = z.object({
  object: z.literal(ApiObjectType.CONTENT_ANALYTICS),
  contentId: z.string(),
  environmentId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  timezone: z.string(),
  ...counts,
  byDay: z.array(analyticsByDay),
  /** Populated for flows; null for every other content type. */
  steps: z.array(stepAnalytics).nullable(),
  /** Populated for checklists; null otherwise. */
  tasks: z.array(taskAnalytics).nullable(),
  /** Populated for resource centers; null otherwise. */
  blocks: z.array(blockAnalytics).nullable(),
});
export class ContentAnalyticsDto extends createZodDto(contentAnalytics) {}
export type ContentAnalytics = z.infer<typeof contentAnalytics>;

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
  results: z.array(questionAnalytics),
});
export class QuestionAnalyticsResponseDto extends createZodDto(questionAnalyticsResponse) {}
