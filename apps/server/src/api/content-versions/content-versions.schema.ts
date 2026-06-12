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
 * `themeId` switches the theme (a theme is required for the version to render, so
 * it can be changed but not cleared).
 */
export const updateVersionBody = z.object({
  steps: z.array(representationStepInput).optional(),
  startRules: representationStartRules.nullable().optional(),
  hideRules: representationHideRules.nullable().optional(),
  themeId: z.string().optional().describe('Theme to apply (cannot be cleared).'),
  /**
   * Type-specific body for non-flow content (checklist / launcher / banner /
   * tracker / resource-center). Validated against the content type; field-level
   * merged onto the existing version data. Not used by `flow` (use `steps`).
   */
  data: z.unknown().optional(),
});
export class UpdateVersionBodyDto extends createZodDto(updateVersionBody) {}
export type UpdateVersionBody = z.infer<typeof updateVersionBody>;

export const listContentVersionsResponse = z.object({
  results: z.array(contentVersion),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListContentVersionsResponseDto extends createZodDto(listContentVersionsResponse) {}

/** One usability problem found by the dry-run validator. */
export const usabilityIssue = z.object({
  severity: z.enum(['error', 'warning']),
  path: z.string().describe('Where the problem is, e.g. `steps[2] "Sidebar"`.'),
  message: z.string(),
});

/**
 * Dry-run usability report. `ok` is false when there are any errors — those are
 * exactly what blocks publish. Warnings are advisory (e.g. an unreachable step).
 */
export const versionUsabilityReport = z.object({
  ok: z.boolean().describe('True when there are no errors (i.e. the version is publishable).'),
  errors: z.array(usabilityIssue),
  warnings: z.array(usabilityIssue),
});
export class VersionUsabilityReportDto extends createZodDto(versionUsabilityReport) {}

export type VersionExpand = z.infer<typeof versionExpand>;
export type ListContentVersionsQuery = z.infer<typeof listContentVersionsQuery>;
export type GetContentVersionQuery = z.infer<typeof getContentVersionQuery>;
