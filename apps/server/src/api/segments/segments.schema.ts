import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { orderByField, singleOrArray } from '../shared/query';

import { attributeCondition } from '../content-representation/representation.schema';
import { nameSearchField } from '@/common/filters';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

/**
 * v2 segments. Segment definitions are project-level; membership is env-level
 * (managed via the env-rooted members endpoints). `kind: condition` segments carry
 * `conditions`; `kind: manual` segments hold an explicit member list; `kind: all`
 * is the built-in everyone segment (read-only).
 */

export const segmentBizType = z.enum(['user', 'company']);
export const segmentKind = z.enum(['all', 'condition', 'manual']);

/**
 * Segment membership conditions are an ATTRIBUTE query — the builder's segment
 * editor offers only attribute conditions (and groups of them), and the member
 * evaluator computes attribute filters, nothing else. The schema declares
 * exactly that subset instead of the general condition vocabulary: advertising
 * event / current_url / content_state here taught agents to write conditions
 * the service must reject (a real zero-knowledge-eval friction). For behavior-
 * based audiences ("users who did X"), have the app also store the fact as an
 * attribute and segment on that — or put the event condition on the content's
 * start rules, which DO evaluate events.
 */
export type SegmentCondition =
  | z.infer<typeof attributeCondition>
  | { type: 'group'; match: 'all' | 'any'; conditions: SegmentCondition[] };

export const segmentCondition: z.ZodType<SegmentCondition> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('group'),
      match: z.enum(['all', 'any']),
      conditions: z.array(segmentCondition),
    }),
    attributeCondition,
  ]),
) as unknown as z.ZodType<SegmentCondition>;

export const segment = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.SEGMENT),
  name: z.string(),
  bizType: segmentBizType,
  kind: segmentKind,
  // Present for condition segments (decompiled to stable codes).
  conditions: z.array(segmentCondition).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class SegmentDto extends createZodDto(segment) {}

export const listSegmentsQuery = z.object({
  bizType: segmentBizType.optional().describe('Filter to user or company segments.'),
  limit,
  cursor,
  ...nameSearchField,
  orderBy: singleOrArray(orderByField).describe('Order by createdAt / -createdAt.'),
});
export class ListSegmentsQueryDto extends createZodDto(listSegmentsQuery) {}

export const listSegmentsResponse = z.object({
  results: z.array(segment),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListSegmentsResponseDto extends createZodDto(listSegmentsResponse) {}

export const createSegmentBody = z
  .object({
    name: z.string().min(1).describe('Segment name.'),
    bizType: segmentBizType.describe('What the segment groups: user or company. Immutable.'),
    // `all` is the built-in everyone segment and cannot be created.
    kind: z.enum(['condition', 'manual']).describe('Segment kind. Immutable.'),
    conditions: z
      .array(segmentCondition)
      .optional()
      .describe(
        'Membership conditions (condition segments only) — ATTRIBUTE conditions and groups of ' +
          'them, nothing else (a segment is an attribute query). For "users who did X" audiences, ' +
          'store the fact as an attribute too and segment on that, or put the event condition on ' +
          "the content's start rules.",
      ),
  })
  .strict();
export class CreateSegmentBodyDto extends createZodDto(createSegmentBody) {}

export const updateSegmentBody = z
  .object({
    name: z.string().min(1).optional(),
    conditions: z
      .array(segmentCondition)
      .optional()
      .describe(
        'Replaces the conditions (condition segments only). Attribute conditions and groups ' +
          'only — see create_segment.',
      ),
  })
  // Only name/conditions are mutable — bizType and kind are immutable. Reject a
  // stray key (e.g. a whole create body sent to update) instead of silently
  // dropping it, so the caller learns the field was not applied.
  .strict();
export class UpdateSegmentBodyDto extends createZodDto(updateSegmentBody) {}

export type Segment = z.infer<typeof segment>;
export type SegmentBizTypeName = z.infer<typeof segmentBizType>;
export type ListSegmentsQuery = z.infer<typeof listSegmentsQuery>;
export type CreateSegmentBody = z.infer<typeof createSegmentBody>;
export type UpdateSegmentBody = z.infer<typeof updateSegmentBody>;
