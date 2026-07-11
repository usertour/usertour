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
  fetch: (params: PageParams) => Promise<CursorConnection<TNode>>;
  map: (node: TNode) => TOut | Promise<TOut>;
}

/**
 * Build a same-endpoint URL, replacing `cursor`/`limit` on top of the ORIGINAL
 * request URL. Filters/expand ride along untouched because `requestUrl` is the
 * caller's full URL including its query string — services must NOT re-echo them
 * (MCP's sentinel `mcp://` URLs carry none, and toListPayload keeps only the
 * cursor anyway).
 */
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
  opts: Pick<PaginateOptions<TNode, unknown>, 'requestUrl' | 'cursor' | 'limit' | 'fetch'>,
): Promise<string | null> {
  const { requestUrl, cursor, limit, fetch } = opts;
  if (!cursor) {
    return null;
  }
  // The previous page is the `limit` rows ENDING just before the current page's
  // first row. Its `previous` link must be an `after` cursor that paginate()
  // (first/after, exclusive) turns back into exactly that page — i.e. the cursor
  // of the row BEFORE the previous page's first row. Fetch one extra row toward
  // the start to get that predecessor in the same query.
  const window = await fetch({ last: limit + 1, before: connection.edges[0].cursor });
  if (!window.edges.length) {
    return null;
  }
  const firstPageUrl = buildUrl(requestUrl, { limit });
  // Fewer than limit+1 rows precede the current page → the previous page starts at
  // the very first row, so `previous` is the (cursorless) first page.
  if (window.edges.length <= limit) {
    return firstPageUrl;
  }
  // window[0] is the predecessor of the previous page's first row; after it,
  // paginate() returns exactly the previous `limit` rows.
  return buildUrl(requestUrl, { cursor: window.edges[0].cursor, limit });
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
  const { requestUrl, cursor, limit, fetch, map } = opts;

  const connection = await fetch({ first: limit, after: cursor });
  if (!connection.edges.length && cursor) {
    // A cursor page with zero rows: a server-issued `next` whose remaining rows
    // were deleted in the meantime is indistinguishable from a stale/foreign
    // cursor, so return the empty FINAL page (common cursor-API practice) instead of a 400 —
    // a sync client following our own link must not crash. (v1 keeps its 400.)
    return { results: [], next: null, previous: null };
  }

  // MCP callers page through sentinel `mcp://` request URLs and keep only `next`
  // (toListPayload) — computing `previous` there burns 1-2 extra findMany+count
  // round-trips per page for a value that is always discarded. REST keeps the
  // full previous/next contract.
  const previous = requestUrl.startsWith('mcp://')
    ? null
    : await resolvePreviousUrl(connection, { requestUrl, cursor, limit, fetch });
  const results = await Promise.all(connection.edges.map((edge) => map(edge.node)));
  const next =
    connection.pageInfo.hasNextPage && connection.pageInfo.endCursor
      ? buildUrl(requestUrl, { cursor: connection.pageInfo.endCursor, limit })
      : null;

  return { results, next, previous };
}
