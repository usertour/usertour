export interface SortOrder {
  [key: string]: 'asc' | 'desc';
}

export function parseOrderBy(orderBy?: string | string[]): SortOrder[] {
  if (!orderBy) {
    return [{ id: 'desc' }];
  }

  const fields = Array.isArray(orderBy) ? orderBy : [orderBy];

  return fields.map((field) => {
    const isDescending = field.startsWith('-');
    return {
      [isDescending ? field.substring(1) : field]: isDescending ? 'desc' : 'asc',
    };
  });
}
