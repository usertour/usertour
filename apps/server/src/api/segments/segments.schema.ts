import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { orderByField, singleOrArray } from '../shared/query';

import { representationCondition } from '../content-representation/representation.schema';
import { nameSearchField } from '../shared/filters';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

/**
 * v2 segments. Segment definitions are project-level; membership is env-level
 * (managed via the env-rooted members endpoints). `kind: condition` segments carry
 * `conditions` (the same rule-condition model content uses) — decompiled/compiled
 * through the shared rules codec; `kind: manual` segments hold an explicit member
 * list; `kind: all` is the built-in everyone segment (read-only).
 */

export const segmentBizType = z.enum(['user', 'company']);
export const segmentKind = z.enum(['all', 'condition', 'manual']);

export const segment = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.SEGMENT),
  name: z.string(),
  bizType: segmentBizType,
  kind: segmentKind,
  // Present for condition segments (decompiled to stable codes).
  conditions: z.array(representationCondition).optional(),
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

export const createSegmentBody = z.object({
  name: z.string().min(1).describe('Segment name.'),
  bizType: segmentBizType.describe('What the segment groups: user or company. Immutable.'),
  // `all` is the built-in everyone segment and cannot be created.
  kind: z.enum(['condition', 'manual']).describe('Segment kind. Immutable.'),
  conditions: z
    .array(representationCondition)
    .optional()
    .describe('Membership conditions (condition segments only).'),
});
export class CreateSegmentBodyDto extends createZodDto(createSegmentBody) {}

export const updateSegmentBody = z.object({
  name: z.string().min(1).optional(),
  conditions: z
    .array(representationCondition)
    .optional()
    .describe('Replaces the conditions (condition segments only).'),
});
export class UpdateSegmentBodyDto extends createZodDto(updateSegmentBody) {}

export type Segment = z.infer<typeof segment>;
export type SegmentBizTypeName = z.infer<typeof segmentBizType>;
export type ListSegmentsQuery = z.infer<typeof listSegmentsQuery>;
export type CreateSegmentBody = z.infer<typeof createSegmentBody>;
export type UpdateSegmentBody = z.infer<typeof updateSegmentBody>;
