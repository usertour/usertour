import { z } from 'zod';

/**
 * A query param that arrives as a single value or a repeated array, optional.
 * Shared across every v2 list schema (orderBy / expand / multi-value filters) so
 * the single-or-array shape is defined once.
 */
export function singleOrArray<T extends z.ZodTypeAny>(item: T) {
  return z.union([item, z.array(item)]).optional();
}

/**
 * Normalize a parsed `singleOrArray` value (single / array / undefined) to a plain
 * array — the runtime counterpart to {@link singleOrArray}, so services always work
 * with an array. (For the variant that preserves `undefined`, keep a local helper.)
 */
export function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * The common `orderBy` field for v2 list endpoints: `createdAt` (oldest first) or
 * `-createdAt` (newest first). Resources with extra sort keys declare their own
 * enum (e.g. attribute-definitions adds codeName / displayName).
 */
export const orderByField = z.enum(['createdAt', '-createdAt']);
