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
  const orders: SortOrder[] = fields.map((field) => {
    const descending = field.startsWith('-');
    return { [descending ? field.slice(1) : field]: descending ? 'desc' : 'asc' };
  });
  // Cursor pagination needs a UNIQUE total order: rows sharing a createdAt (bulk
  // imports write hundreds in one transaction timestamp) otherwise reorder
  // arbitrarily between queries, and pages skip/duplicate rows. Append an `id`
  // tiebreak (same direction as the last key) unless the caller already sorts by id.
  const names = fields.map((f) => (f.startsWith('-') ? f.slice(1) : f));
  if (!names.includes('id')) {
    const lastDirection = Object.values(orders[orders.length - 1])[0];
    orders.push({ id: lastDirection });
  }
  return orders;
}
