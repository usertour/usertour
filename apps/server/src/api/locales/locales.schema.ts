import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ApiObjectType } from '../shared/object-type';
import { nextPageUrl, previousPageUrl } from '../shared/pagination.schema';

/**
 * `GET /v2/locales` — the locale catalog the dashboard's picker is built from,
 * as data. Project-less and capability-less like `/v2/me`: it is reference
 * data, identical for every caller.
 *
 * It is a CATALOG, not a vocabulary: a localization's `code` may be any
 * string (custom codes like `fr-enterprise` are a supported shape), and
 * `locale` may be any well-formed tag. What the catalog gives a caller is the
 * pairing — a tag together with the language name to file it under, which is
 * also the name machine translation is asked to translate into.
 */
const localeOption = z.object({
  object: z.literal(ApiObjectType.LOCALE),
  locale: z
    .string()
    .describe(
      'BCP-47 tag, e.g. `fr-FR`. Region-less entries (e.g. `ar`) are languages usually translated once.',
    ),
  name: z.string().describe('The language name to file it under, e.g. `French (France)`.'),
});

/**
 * The same envelope every v2 collection uses, so a client can read it with the
 * same code — the catalog is one page, so `next`/`previous` are always null.
 */
export const listLocales = z.object({
  results: z.array(localeOption),
  next: nextPageUrl,
  previous: previousPageUrl,
});
export class ListLocalesResponseDto extends createZodDto(listLocales) {}
