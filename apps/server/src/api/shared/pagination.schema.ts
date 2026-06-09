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

export const cursor = z.string().optional().describe('Pagination cursor from a prior response.');
