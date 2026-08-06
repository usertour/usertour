import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { orderByField, singleOrArray } from '../shared/query';

import { representationCondition } from '../content-representation/representation.schema';
import { nameSearchField } from '@/common/filters';
import { displayName } from '../shared/name';
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

export const themeExpand = z.enum(['settings', 'variations', 'resolvedSettings']);

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
  variationCount: z
    .number()
    .int()
    .describe(
      'How many conditional variations this theme carries (always present, no expand needed). ' +
        'Check it BEFORE pointing content at another theme: variations do NOT travel with the ' +
        'content, so moving from a theme with variations to one with 0 silently drops the ' +
        'conditional styling (e.g. dark mode) for every user those conditions targeted — nothing ' +
        'errors. Read the variations themselves with expand: ["variations"].',
    ),
  // Present only when the corresponding expand is requested.
  settings: themeSettings.optional(),
  resolvedSettings: themeSettings
    .optional()
    .describe(
      'Read-only render resolution of `settings`: the same shape with every "Auto" replaced ' +
        'by the concrete color the renderer derives (the shared derivation the SDK runs). ' +
        'Request with expand: ["resolvedSettings"]. Not writable — author intent in `settings`.',
    ),
  variations: z.array(themeVariation).optional(),
});
export class ThemeDto extends createZodDto(theme) {}

export const listThemesQuery = z.object({
  limit,
  cursor,
  ...nameSearchField,
  orderBy: singleOrArray(orderByField).describe('Order by createdAt / -createdAt.'),
  expand: singleOrArray(themeExpand).describe(
    'Inline: settings (stored intent), variations, resolvedSettings (every "Auto" resolved).',
  ),
});
export class ListThemesQueryDto extends createZodDto(listThemesQuery) {}

export const getThemeQuery = z.object({
  expand: singleOrArray(themeExpand).describe(
    'Inline: settings (stored intent), variations, resolvedSettings (every "Auto" resolved).',
  ),
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
// Both settings and variations are readable via expand.
const settingsField = themeSettingsPatchSchema
  .optional()
  .describe(
    'Partial theme styling to merge onto the current settings (colors, fonts, ' +
      'sizes, …). Send only the fields you change; omitted fields are kept. This is pure ' +
      'INTENT: Auto-capable color fields take a hex or the literal "Auto" (derived at ' +
      'render); read what "Auto" resolves to with expand: ["resolvedSettings"].',
  );

/**
 * One conditional variation on a write. Validated by the SERVICE (not the body
 * schema) so the MCP path — which exposes `variations` as a permissive array to
 * keep tools/list lean, mirroring `settings` — goes through the exact same
 * checks as REST. Condition types are restricted there to the theme builder's
 * variation set (user attribute / current_url / group), keeping both authoring
 * surfaces aligned; the variation is picked client-side at render time.
 */
export const themeVariationInput = z
  .object({
    id: z
      .string()
      .optional()
      .describe(
        'Echo an existing variation id (from get_theme expand:["variations"]) to update it in ' +
          'place — its stored settings are the merge base. Omit to create a new variation ' +
          '(the theme base settings are the merge base).',
      ),
    name: z.string().min(1).describe('Human-readable label for this variation.'),
    conditions: z
      .array(representationCondition)
      .min(1)
      .describe(
        'When this variation applies — evaluated in the BROWSER on each render; the first ' +
          'variation (in array order) whose conditions match wins, else the base settings ' +
          'apply. Takes user attribute / current_url conditions and groups of them.',
      ),
    settings: themeSettingsPatchSchema
      .optional()
      .describe('Partial style patch merged onto the merge base (see `id`).'),
  })
  .strict();
export type ThemeVariationInput = z.infer<typeof themeVariationInput>;

const variationsField = z
  .array(themeVariationInput)
  .optional()
  .describe(
    'Conditional variations — FULL replacement of the list when present (a variation you ' +
      'omit is deleted; omit the field entirely to leave variations untouched). Array order ' +
      'is evaluation priority.',
  );

export const createThemeBody = z
  .object({
    name: displayName.describe('Theme name.'),
    isDefault: z.boolean().optional().describe('Make this the project default theme.'),
    settings: settingsField,
    variations: variationsField,
  })
  .strict();
export class CreateThemeBodyDto extends createZodDto(createThemeBody) {}

/** Write body for POST themes/:id/duplicate. */
export const duplicateThemeBody = z
  .object({
    name: displayName.optional().describe('Name for the copy (defaults to the source name).'),
  })
  .strict();
export class DuplicateThemeBodyDto extends createZodDto(duplicateThemeBody) {}
export type DuplicateThemeBody = z.infer<typeof duplicateThemeBody>;

export const updateThemeBody = z
  .object({
    name: displayName.optional(),
    isDefault: z
      .boolean()
      .optional()
      .describe(
        'Set `true` to make this the project default theme (the previous default is ' +
          'cleared). `false` on the current default is rejected — default another ' +
          'theme instead; a project always keeps a default.',
      ),
    settings: settingsField,
    variations: variationsField,
  })
  .strict();
export class UpdateThemeBodyDto extends createZodDto(updateThemeBody) {}

export type Theme = z.infer<typeof theme>;
export type ThemeExpand = z.infer<typeof themeExpand>;
export type ListThemesQuery = z.infer<typeof listThemesQuery>;
export type GetThemeQuery = z.infer<typeof getThemeQuery>;
export type CreateThemeBody = z.infer<typeof createThemeBody>;
export type UpdateThemeBody = z.infer<typeof updateThemeBody>;
