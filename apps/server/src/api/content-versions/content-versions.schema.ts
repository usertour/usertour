import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import {
  contentVersion,
  representationHideRules,
  representationStartRules,
  representationStepInput,
} from '../content-representation/representation.schema';

/** A query param that arrives as a single value or a repeated array. */
function singleOrArray<T extends z.ZodTypeAny>(item: T) {
  return z.union([item, z.array(item)]).optional();
}

export const versionExpand = z.enum(['questions', 'steps', 'data']);
const orderByField = z.enum(['createdAt', '-createdAt']);

export const getContentVersionQuery = z.object({
  expand: singleOrArray(versionExpand).describe('Inline the version questions.'),
});
export class GetContentVersionQueryDto extends createZodDto(getContentVersionQuery) {}

export const listContentVersionsQuery = z.object({
  contentId: z.string().describe('The content whose versions to list.'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  orderBy: singleOrArray(orderByField).describe('Order by createdAt / -createdAt.'),
  expand: singleOrArray(versionExpand).describe('Inline the version questions.'),
});
export class ListContentVersionsQueryDto extends createZodDto(listContentVersionsQuery) {}

export class ContentVersionDto extends createZodDto(contentVersion) {}

/**
 * Write body for PATCH content-versions/:id. All fields optional — only the
 * provided ones are written. `steps` replaces the version's step list (merged
 * by cvid); `startRules`/`hideRules` set or clear (null) the version's rules;
 * `themeId` sets the theme (or `null` clears it → project default).
 */
export const updateVersionBody = z.object({
  steps: z.array(representationStepInput).optional(),
  startRules: representationStartRules.nullable().optional(),
  hideRules: representationHideRules.nullable().optional(),
  themeId: z.string().nullable().optional().describe('Theme to apply, or null to clear.'),
  /**
   * Type-specific body for non-flow content (checklist / launcher / banner /
   * tracker / resource-center). Validated against the content type; field-level
   * merged onto the existing version data. Not used by `flow` (use `steps`).
   */
  data: z.unknown().optional(),
});
export class UpdateVersionBodyDto extends createZodDto(updateVersionBody) {}
export type UpdateVersionBody = z.infer<typeof updateVersionBody>;

/** Write body for POST content-versions — fork a new draft version of a content. */
export const createVersionBody = z.object({
  contentId: z.string().describe('The content to fork a new draft version of.'),
});
export class CreateVersionBodyDto extends createZodDto(createVersionBody) {}
export type CreateVersionBody = z.infer<typeof createVersionBody>;

export const listContentVersionsResponse = z.object({
  results: z.array(contentVersion),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListContentVersionsResponseDto extends createZodDto(listContentVersionsResponse) {}

export type VersionExpand = z.infer<typeof versionExpand>;
export type ListContentVersionsQuery = z.infer<typeof listContentVersionsQuery>;
export type GetContentVersionQuery = z.infer<typeof getContentVersionQuery>;
