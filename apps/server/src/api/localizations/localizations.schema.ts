import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ApiObjectType } from '../shared/object-type';
import { nextPageUrl, previousPageUrl } from '../shared/pagination.schema';
import { isoTimestamp } from '../shared/query';

/**
 * v2 localizations. A project declares the locales it translates into; each
 * content version then holds one translation per locale. The translation is
 * exposed as flat units (path / source / translation) — the same model the
 * dashboard exports and imports as a file — so a caller never has to
 * understand the editor tree the text lives in.
 */
export const localization = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.LOCALIZATION),
  code: z
    .string()
    .describe(
      "The locale's code — how version translations are addressed, and the value matched " +
        "against the end user's `locale_code` attribute to pick a translation at delivery.",
    ),
  name: z
    .string()
    .describe(
      'The language this locale stands for, e.g. "French (France)" — also what machine ' +
        'translation is asked to translate into.',
    ),
  locale: z.string().describe('The locale tag this entry was created from, e.g. `fr-FR`.'),
  isDefault: z
    .boolean()
    .describe(
      'The source language content is authored in. It has no translation of its own — version ' +
        'translations exist only for the non-default locales.',
    ),
  deleted: z
    .boolean()
    .describe(
      'Soft-deleted: no longer offered or delivered, but the translations it holds on every ' +
        'version are kept, so restoring it brings them all back.',
    ),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});
export class LocalizationDto extends createZodDto(localization) {}

export const listLocalizationsQuery = z.object({
  deleted: z
    .stringbool()
    .meta({ enum: ['true', 'false'] })
    .optional()
    .describe(
      'List soft-deleted localizations instead of live ones — the recovery pool for restore.',
    ),
});
export class ListLocalizationsQueryDto extends createZodDto(listLocalizationsQuery) {}
export type ListLocalizationsQuery = z.infer<typeof listLocalizationsQuery>;

const localeTag = z
  .string()
  .min(2)
  .max(35)
  .describe(
    'The locale tag this entry stands for, e.g. `fr-FR`. `GET /v2/locales` lists the common ' +
      'tags with the language name to file each one under.',
  );
const localizationName = z
  .string()
  .min(2)
  .max(64)
  .describe(
    'The language this locale stands for, e.g. "French (France)". Machine translation is asked ' +
      'to translate INTO this name, so a real language name (copied from `GET /v2/locales`) ' +
      'translates better than an improvised label.',
  );
const localizationCode = z
  .string()
  .min(2)
  .max(35)
  .describe(
    "The value matched against an end user's `locale_code` attribute to pick their translation, " +
      'and how a version translation is addressed in the URL path. Letters, digits, `-` and `_` ' +
      'only. Unique within the project, case-insensitively (delivery ignores case). Usually the ' +
      'locale tag, but free-form: `fr-enterprise` next to `fr` gives one language two variants.',
  );

export const createLocalizationBody = z
  .object({ code: localizationCode, name: localizationName, locale: localeTag })
  .strict();
export class CreateLocalizationBodyDto extends createZodDto(createLocalizationBody) {}
export type CreateLocalizationBody = z.infer<typeof createLocalizationBody>;

/** Create response: the localization, plus whether it was brought back rather than made. */
export const createdLocalization = localization.extend({
  restored: z
    .boolean()
    .describe(
      'true when this `code` belonged to a soft-deleted localization: that one was RESTORED ' +
        '(same id, with every translation it held) instead of a new one being created.',
    ),
});
export class CreatedLocalizationDto extends createZodDto(createdLocalization) {}

// `isDefault` is not settable here — switching the source language has
// project-wide side effects; this surface only manages the target locales.
export const updateLocalizationBody = z
  .object({
    code: localizationCode.optional(),
    name: localizationName.optional(),
    locale: localeTag.optional(),
  })
  .strict()
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Provide at least one of `code`, `name`, `locale`.',
  });
export class UpdateLocalizationBodyDto extends createZodDto(updateLocalizationBody) {}
export type UpdateLocalizationBody = z.infer<typeof updateLocalizationBody>;

export const listLocalizationsResponse = z.object({
  results: z.array(localization),
  next: nextPageUrl,
  previous: previousPageUrl,
});
export class ListLocalizationsResponseDto extends createZodDto(listLocalizationsResponse) {}

export const translationUnit = z.object({
  path: z
    .string()
    .describe(
      'Stable address of this text within the version. Echo it as the key in `translations` ' +
        'when writing. Flow units are `steps/<step cvid>/<unit path>`.',
    ),
  source: z.string().describe('The text in the source language.'),
  translation: z.string().describe('The current translation, or "" when untranslated.'),
  optional: z
    .boolean()
    .describe(
      'true for media / link URLs: they may be swapped per locale but count as neither text ' +
        'to translate nor "missing" when left empty (the source URL is used).',
    ),
  outdated: z
    .boolean()
    .describe(
      'true when the source text changed after this translation was saved — the translation ' +
        'still ships, but it was written against older source text and should be re-reviewed.',
    ),
});

export const translationStats = z.object({
  total: z.number().describe('Number of translatable units in the version.'),
  missing: z.number().describe('Required (non-optional) units with no translation.'),
  outdated: z.number().describe('Translated units whose source text changed since.'),
});

export const versionLocalization = z.object({
  object: z.literal(ApiObjectType.CONTENT_VERSION_LOCALIZATION),
  versionId: z.string(),
  code: z.string(),
  name: z.string(),
  enabled: z
    .boolean()
    .describe(
      'Whether this translation is delivered. A disabled (or missing) translation means users ' +
        'of that locale see the source language.',
    ),
  stats: translationStats,
  units: z.array(translationUnit),
  updatedAt: isoTimestamp
    .nullable()
    .describe('When the translation was last saved; null when it was never saved.'),
});
export class VersionLocalizationDto extends createZodDto(versionLocalization) {}

/** Per-locale translation status, inlined on a version by the `localizations` expand. */
export const versionLocalizationSummary = z.object({
  code: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  missing: z.number(),
  outdated: z.number(),
});
export type VersionLocalizationSummary = z.infer<typeof versionLocalizationSummary>;

export const updateVersionLocalizationBody = z
  .object({
    translations: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        'Unit path → translated text. Only the listed units change; a blank value keeps the ' +
          'existing translation. Every path must be one the version currently has (read them ' +
          'first) — unknown paths are rejected, not dropped. Saving re-bases the WHOLE ' +
          "translation's drift tracking on the current source text, so send every unit you " +
          'intend to fix for this locale in ONE request.',
      ),
    enabled: z
      .boolean()
      .optional()
      .describe(
        'Deliver this translation (true) or fall back to the source language (false). Sent ' +
          'alone it only flips the switch and leaves the translation untouched.',
      ),
  })
  .strict()
  .refine((body) => body.translations !== undefined || body.enabled !== undefined, {
    message: 'Provide `translations`, `enabled`, or both.',
  });
export class UpdateVersionLocalizationBodyDto extends createZodDto(updateVersionLocalizationBody) {}
export type UpdateVersionLocalizationBody = z.infer<typeof updateVersionLocalizationBody>;
