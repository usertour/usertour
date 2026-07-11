import { z } from 'zod';

/**
 * An UNAMBIGUOUS ISO 8601 instant: a date-only string (spec-parsed as UTC —
 * deployment-independent) or a datetime WITH an explicit timezone (Z / ±hh:mm).
 * A timezone-less datetime ("2026-07-10T00:00:00") is REJECTED: JS parses it in
 * the SERVER's local zone, so the same request would filter a different range on
 * a UTC cloud deployment vs a UTC+8 self-host — an incremental-sync client then
 * silently skips or re-reads hours of records.
 */
const UNAMBIGUOUS_ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2}))?$/;
export const isUnambiguousIsoDate = (s: string): boolean =>
  UNAMBIGUOUS_ISO.test(s) && !Number.isNaN(Date.parse(s));

const ISO_MESSAGE =
  'Expected an ISO 8601 date ("2026-07-10") or datetime WITH timezone ' +
  '("2026-07-10T00:00:00Z" / "…+08:00") — a timezone-less datetime is ambiguous across deployments.';

const isoDateTime = z.string().refine(isUnambiguousIsoDate, ISO_MESSAGE);

/**
 * Reusable `createdAt` range query fields for v2 list endpoints. Flat params
 * (`createdAfter` / `createdBefore`), AND-combined — the common "since/until"
 * filter for incremental sync. Spread into a list query's zod object.
 */
export const createdAtRangeFields = {
  createdAfter: isoDateTime
    .optional()
    .describe(
      'Only items created at or after this time — ISO date or datetime WITH timezone. ' +
        "A date-only value starts at that day's first instant (UTC).",
    ),
  createdBefore: isoDateTime
    .optional()
    .describe(
      'Only items created at or before this time — ISO date or datetime WITH timezone. ' +
        'A date-only value includes the ENTIRE day (up to its last instant, UTC).',
    ),
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
 * the resource's column (`name` for most; attribute/event definitions match it
 * against BOTH codeName and displayName via an `OR`, since callers reference the
 * codeName), e.g. `...(nameContains(query.name) ? { name: nameContains(query.name)! } : {})`
 * or `const f = nameContains(query.name); if (f) where.OR = [{ codeName: f }, { displayName: f }];`.
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
      ...(before ? { lte: upperBound(before) } : {}),
    },
  };
}

/**
 * The documented-INCLUSIVE upper bound. A date-only value parses to that day's
 * MIDNIGHT UTC — `lte` at midnight would silently exclude the whole named day
 * (an "until 2026-07-10" sync would drop every record created ON the 10th).
 * Normalize it to the day's last instant, the same convention the v2 analytics
 * range applies to its date-only `endDate`. Timestamps pass through untouched.
 */
function upperBound(before: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(before)
    ? new Date(`${before}T23:59:59.999Z`)
    : new Date(before);
}
