export interface SortOrder {
  [key: string]: 'asc' | 'desc';
}

/**
 * Parse an `orderBy` query param (`field` / `-field`, single or array) into
 * Prisma order objects. Owned by the v2 module; mirrors v1's behavior so result
 * ordering — and therefore the parity tests — match.
 */
export function parseOrderBy(orderBy?: string | string[]): SortOrder[] {
  if (!orderBy) {
    return [{ id: 'desc' }];
  }
  const fields = Array.isArray(orderBy) ? orderBy : [orderBy];
  return fields.map((field) => {
    const descending = field.startsWith('-');
    return { [descending ? field.slice(1) : field]: descending ? 'desc' : 'asc' };
  });
}
