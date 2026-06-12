import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { representationCondition } from '../content-representation/representation.schema';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

/**
 * v2 themes endpoint. The base projection (id/name/isDefault/timestamps) is always
 * returned; the heavy `settings` and `variations` are opt-in via `expand`.
 *
 * `settings` is passed through as an opaque object (the theme builder's config
 * shape) — validated as an object, stored as-is. `variations[].conditions` is the
 * one structured part: it's the same rule-condition model content uses, so it goes
 * through the shared rules codec (internal ids <-> stable codes) on read/write;
 * `variations[].settings` is pass-through like the base settings.
 */

/** A query param that arrives as a single value or a repeated array. */
function singleOrArray<T extends z.ZodTypeAny>(item: T) {
  return z.union([item, z.array(item)]).optional();
}

export const themeExpand = z.enum(['settings', 'variations']);
const orderByField = z.enum(['createdAt', '-createdAt']);

/** Theme settings — an opaque (pass-through) object. */
const themeSettings = z.record(z.string(), z.unknown());

/** A conditional variation as returned on read (conditions decompiled to codes). */
const themeVariation = z.object({
  id: z.string(),
  name: z.string(),
  conditions: z.array(representationCondition),
  settings: themeSettings,
});

export const theme = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.THEME),
  name: z.string(),
  isDefault: z.boolean(),
  updatedAt: z.string(),
  createdAt: z.string(),
  // Present only when the corresponding expand is requested.
  settings: themeSettings.optional(),
  variations: z.array(themeVariation).optional(),
});
export class ThemeDto extends createZodDto(theme) {}

export const listThemesQuery = z.object({
  limit,
  cursor,
  orderBy: singleOrArray(orderByField).describe('Order by createdAt / -createdAt.'),
  expand: singleOrArray(themeExpand).describe('Inline: settings, variations.'),
});
export class ListThemesQueryDto extends createZodDto(listThemesQuery) {}

export const getThemeQuery = z.object({
  expand: singleOrArray(themeExpand).describe('Inline: settings, variations.'),
});
export class GetThemeQueryDto extends createZodDto(getThemeQuery) {}

export const listThemesResponse = z.object({
  results: z.array(theme),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListThemesResponseDto extends createZodDto(listThemesResponse) {}

// Theme `settings` and `variations` are NOT writable through the API: they are a
// large, cascaded, visually-tuned structure with no safe machine contract yet, so
// the API would just be accepting unvalidated data. The write surface is limited
// to metadata; a created theme is seeded with the default settings, and styling is
// tuned in the theme builder. `settings` / `variations` remain readable via expand.
export const createThemeBody = z.object({
  name: z.string().min(1).describe('Theme name.'),
  isDefault: z.boolean().optional().describe('Make this the project default theme.'),
});
export class CreateThemeBodyDto extends createZodDto(createThemeBody) {}

export const updateThemeBody = z.object({
  name: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
});
export class UpdateThemeBodyDto extends createZodDto(updateThemeBody) {}

export type Theme = z.infer<typeof theme>;
export type ThemeExpand = z.infer<typeof themeExpand>;
export type ListThemesQuery = z.infer<typeof listThemesQuery>;
export type GetThemeQuery = z.infer<typeof getThemeQuery>;
export type CreateThemeBody = z.infer<typeof createThemeBody>;
export type UpdateThemeBody = z.infer<typeof updateThemeBody>;
