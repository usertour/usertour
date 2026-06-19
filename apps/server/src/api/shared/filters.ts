import { z } from 'zod';

// ISO 8601 datetime string, validated without relying on zod's moved .datetime() API.
const isoDateTime = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Expected an ISO 8601 datetime');

/**
 * Reusable `createdAt` range query fields for v2 list endpoints. Flat params
 * (`createdAfter` / `createdBefore`), AND-combined — the common "since/until"
 * filter for incremental sync. Spread into a list query's zod object.
 */
export const createdAtRangeFields = {
  createdAfter: isoDateTime
    .optional()
    .describe('Only items created at or after this ISO 8601 time.'),
  createdBefore: isoDateTime
    .optional()
    .describe('Only items created at or before this ISO 8601 time.'),
};

/**
 * Reusable name-search query field for v2 list endpoints. Spread into a list
 * query's zod object; map it to the resource's display-name column in the
 * service via `nameContains`. Empty / whitespace-only is treated as no filter.
 */
export const nameSearchField = {
  name: z.string().optional().describe('Filter by name (case-insensitive substring match).'),
};

/**
 * Build a case-insensitive substring filter from an optional search term, or
 * `undefined` when the term is empty/whitespace. Apply at the call site under
 * the resource's column (`name` for most, `displayName` for definitions), e.g.
 * `...(nameContains(query.name) ? { name: nameContains(query.name)! } : {})` or
 * `const f = nameContains(query.name); if (f) where.displayName = f;`.
 */
export function nameContains(
  term: string | undefined,
): { contains: string; mode: 'insensitive' } | undefined {
  const trimmed = term?.trim();
  return trimmed ? { contains: trimmed, mode: 'insensitive' } : undefined;
}

/**
 * Build a Prisma `createdAt` range where-fragment from optional ISO strings.
 * Returns `{}` when neither bound is set, so it spreads cleanly into any where.
 */
export function createdAtWhere(
  after?: string,
  before?: string,
): { createdAt?: { gte?: Date; lte?: Date } } {
  if (!after && !before) {
    return {};
  }
  return {
    createdAt: {
      ...(after ? { gte: new Date(after) } : {}),
      ...(before ? { lte: new Date(before) } : {}),
    },
  };
}
