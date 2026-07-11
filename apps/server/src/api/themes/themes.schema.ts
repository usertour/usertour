import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { orderByField, singleOrArray } from '../shared/query';

import { representationCondition } from '../content-representation/representation.schema';
import { nameSearchField } from '@/common/filters';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';
import { themeSettingsPatchSchema } from './settings.schema';

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

export const themeExpand = z.enum(['settings', 'variations']);

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
  /** System themes are read-only: not updatable, not deletable — create your own instead. */
  isSystem: z.boolean(),
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
  ...nameSearchField,
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

// `settings` is a partial patch validated against THEME_SETTING_CONSTRAINTS (the
// neutral SSOT, see settings.schema): a created theme starts from the default
// styling and a write field-merges onto it, so callers send only what they change.
// `variations` are still not writable through the API (a later phase). Both remain
// readable via expand.
const settingsField = themeSettingsPatchSchema
  .optional()
  .describe(
    'Partial theme styling to merge onto the current settings (colors, fonts, ' +
      'sizes, …). Send only the fields you change; omitted fields are kept. Auto ' +
      'colors are derived server-side.',
  );

export const createThemeBody = z.object({
  name: z.string().min(1).describe('Theme name.'),
  isDefault: z.boolean().optional().describe('Make this the project default theme.'),
  settings: settingsField,
});
export class CreateThemeBodyDto extends createZodDto(createThemeBody) {}

export const updateThemeBody = z.object({
  name: z.string().min(1).optional(),
  isDefault: z
    .boolean()
    .optional()
    .describe(
      'Set `true` to make this the project default theme (the previous default is ' +
        'cleared). `false` on the current default is rejected — default another ' +
        'theme instead; a project always keeps a default.',
    ),
  settings: settingsField,
});
export class UpdateThemeBodyDto extends createZodDto(updateThemeBody) {}

export type Theme = z.infer<typeof theme>;
export type ThemeExpand = z.infer<typeof themeExpand>;
export type ListThemesQuery = z.infer<typeof listThemesQuery>;
export type GetThemeQuery = z.infer<typeof getThemeQuery>;
export type CreateThemeBody = z.infer<typeof createThemeBody>;
export type UpdateThemeBody = z.infer<typeof updateThemeBody>;
