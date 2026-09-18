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
  name: z.string().describe('Display name, e.g. "French".'),
  locale: z.string().describe('The locale tag this entry was created from, e.g. `fr-FR`.'),
  isDefault: z
    .boolean()
    .describe(
      'The source language content is authored in. It has no translation of its own — version ' +
        'translations exist only for the non-default locales.',
    ),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});
export class LocalizationDto extends createZodDto(localization) {}

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
