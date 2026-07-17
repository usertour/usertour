import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { orderByField, singleOrArray } from '../shared/query';

import {
  contentVersion,
  representationHideRules,
  representationStartRules,
  representationStepInput,
} from '../content-representation/representation.schema';
import { isoDateTime } from '@/common/filters';

import { representationResourceCenter } from '../content-representation/resource-center.schema';
import {
  representationAnnouncement,
  representationBanner,
  representationChecklist,
  representationLauncher,
  representationTracker,
} from '../content-representation/version-data.schema';

export const versionExpand = z.enum(['questions', 'steps', 'data']);

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
  startRules: representationStartRules
    .nullable()
    .optional()
    .describe(
      'PATCHES the stored rules field-by-field: an omitted setting (frequency / priority / ' +
        'waitSeconds / startIfNotComplete) keeps its stored value — including one inherited from ' +
        'the forked version — so to turn a setting off, send it explicitly (e.g. ' +
        '`startIfNotComplete: false`). `when`, when present, fully replaces the condition list. ' +
        '`null` clears the rules entirely (content stops auto-starting).',
    ),
  hideRules: representationHideRules.nullable().optional(),
  themeId: z.string().optional().describe('Theme to apply (cannot be cleared).'),
  /**
   * Type-specific body for non-flow content — one of the five `*Data` shapes. The
   * members are `.loose()` so a partial body for the content's actual type is never
   * stripped at this boundary (the union only documents the shapes; the strict,
   * type-correct validation happens in `compileVersionData`). Field-level merged
   * onto the existing version data. Not used by `flow` (use `steps`).
   */
  data: z
    .union([
      representationChecklist.loose(),
      representationLauncher.loose(),
      representationBanner.loose(),
      representationTracker.loose(),
      representationAnnouncement.loose(),
      representationResourceCenter.loose(),
    ])
    .optional()
    .describe(
      'Type-specific body for a non-flow content version: checklist / launcher / banner / ' +
        'tracker / announcement / resource-center. Field-level merged onto the existing data.',
    ),
  scheduledAt: isoDateTime
    .nullable()
    .optional()
    .describe(
      'Announcement versions only: the "announcement time" — the feed hides the announcement ' +
        'until this instant passes, and orders the feed by it (newest first). ISO date or ' +
        'datetime WITH timezone. `null` = clear (publish stamps the publish time instead). A ' +
        'future value defers visibility; the value carries across version forks.',
    ),
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
