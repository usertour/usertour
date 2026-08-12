import { z } from 'zod';

/**
 * Shared pagination query fragments — one definition reused across every v2
 * resource (and, via `.shape`, by the MCP tools), so paging behaves identically
 * everywhere and can only change in one place.
 */
export const limit = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .default(20)
  .describe('Max items per page (1-100, default 20).');

export const cursor = z
  .string()
  .optional()
  .describe(
    "Opaque page cursor — the `cursor` query value found inside a prior response's " +
      '`next`/`previous` URL. Normally you never build this yourself: just GET those URLs as-is.',
  );

export const nextPageUrl = z
  .string()
  .nullable()
  .describe(
    'Full URL of the next page — request it as-is (it already carries `cursor=` and your ' +
      'query parameters). null = no further pages.',
  );

export const previousPageUrl = z
  .string()
  .nullable()
  .describe('Full URL of the previous page — request it as-is. null = already at the first page.');
