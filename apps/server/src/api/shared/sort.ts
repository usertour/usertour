export interface SortOrder {
  [key: string]: 'asc' | 'desc';
}

/**
 * Parse an `orderBy` query param (`field` / `-field`, single or array) into
 * Prisma order objects. Owned by the v2 module; mirrors v1's behavior so result
 * ordering — and therefore the parity tests — match.
 *
 * `fallback` is used when `orderBy` is absent (the list endpoints' default sort,
 * e.g. `['createdAt']`); when neither is given, falls back to `id desc`. This
 * absorbs the per-service "normalize single/array + default" boilerplate.
 */
export function parseOrderBy(orderBy?: string | string[], fallback: string[] = []): SortOrder[] {
  const fields = orderBy == null ? fallback : Array.isArray(orderBy) ? orderBy : [orderBy];
  if (fields.length === 0) {
    return [{ id: 'desc' }];
  }
  return fields.map((field) => {
    const descending = field.startsWith('-');
    return { [descending ? field.slice(1) : field]: descending ? 'desc' : 'asc' };
  });
}
