import { InvalidCursorError } from '@/common/errors/errors';

export interface PageParams {
  first?: number;
  last?: number;
  after?: string;
  before?: string;
}

/** A relay-style cursor connection (what the domain `listWithPagination` returns). */
export interface CursorConnection<T> {
  edges: { node: T; cursor: string }[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
}

export interface CursorPage<T> {
  results: T[];
  next: string | null;
  previous: string | null;
}

export interface PaginateOptions<TNode, TOut> {
  requestUrl: string;
  cursor?: string;
  limit: number;
  /** Extra params (filters/expand) echoed back into next/previous URLs. */
  query?: Record<string, unknown>;
  fetch: (params: PageParams) => Promise<CursorConnection<TNode>>;
  map: (node: TNode) => TOut | Promise<TOut>;
}

/** Build a same-endpoint URL, replacing `cursor` and merging extra `query` params. */
function buildUrl(endpointUrl: string, params: Record<string, unknown>): string {
  const [baseUrl, existingQuery] = endpointUrl.split('?');
  const search = new URLSearchParams(existingQuery || '');
  search.delete('cursor');
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      search.delete(key);
      search.delete(`${key}[]`);
      for (const item of value) {
        search.append(`${key}[]`, String(item));
      }
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

async function resolvePreviousUrl<TNode>(
  connection: CursorConnection<TNode>,
  opts: Pick<
    PaginateOptions<TNode, unknown>,
    'requestUrl' | 'cursor' | 'limit' | 'query' | 'fetch'
  >,
): Promise<string | null> {
  const { requestUrl, cursor, limit, query, fetch } = opts;
  if (!cursor) {
    return null;
  }
  const previousPage = await fetch({ last: limit, before: connection.edges[0].cursor });
  if (!previousPage.edges.length) {
    return null;
  }
  const firstPageUrl = buildUrl(requestUrl, { limit, ...query });
  // A short previous page is the first page; a full one might still be — confirm
  // by comparing its first cursor to the real first page's.
  if (previousPage.edges.length < limit) {
    return firstPageUrl;
  }
  const firstPage = await fetch({ first: limit });
  if (firstPage.edges[0]?.cursor === previousPage.edges[0].cursor) {
    return firstPageUrl;
  }
  return buildUrl(requestUrl, { cursor: previousPage.edges[0].cursor, limit, ...query });
}

/**
 * Cursor pagination for v2 list endpoints. `fetch` is a domain
 * `listWithPagination` (relay connection); `map` shapes each node into its API
 * representation. Returns `{ results, next, previous }` with same-endpoint URLs.
 * Owned by the v2 module — no dependency on the legacy `common/openapi` helper.
 */
export async function paginate<TNode, TOut>(
  opts: PaginateOptions<TNode, TOut>,
): Promise<CursorPage<TOut>> {
  const { requestUrl, cursor, limit, query, fetch, map } = opts;

  const connection = await fetch({ first: limit, after: cursor });
  if (!connection.edges.length && cursor) {
    throw new InvalidCursorError();
  }

  const previous = await resolvePreviousUrl(connection, {
    requestUrl,
    cursor,
    limit,
    query,
    fetch,
  });
  const results = await Promise.all(connection.edges.map((edge) => map(edge.node)));
  const next =
    connection.pageInfo.hasNextPage && connection.pageInfo.endCursor
      ? buildUrl(requestUrl, { cursor: connection.pageInfo.endCursor, limit, ...query })
      : null;

  return { results, next, previous };
}
