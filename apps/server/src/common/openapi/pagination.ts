import { Logger } from '@nestjs/common';
import { InvalidLimitError, InvalidCursorError } from '../errors/errors';

export interface PaginationResult<T> {
  results: T[];
  next: string | null;
  previous: string | null;
}

export interface PaginationParams {
  first?: number;
  last?: number;
  after?: string;
  before?: string;
}

export interface PaginationConnection<T> {
  edges: { node: T; cursor: string }[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string | null;
    hasPreviousPage?: boolean;
    startCursor?: string | null;
  };
}

const logger = new Logger('Pagination');

function buildUrl(endpointUrl: string, params: Record<string, any>): string {
  const [baseUrl, existingQuery] = endpointUrl.split('?');
  const searchParams = new URLSearchParams(existingQuery || '');

  // Only remove cursor parameter from original URL
  searchParams.delete('cursor');

  // Update parameters from params
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Remove existing array values for this key
        searchParams.delete(key);
        searchParams.delete(`${key}[]`);
        // Add new array values
        for (const item of value) {
          searchParams.append(`${key}[]`, item.toString());
        }
      } else {
        // For non-array parameters, just set the value
        searchParams.set(key, value.toString());
      }
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export async function paginate<T>(
  requestUrl: string,
  cursor: string | undefined,
  limit: number,
  fetchData: (params: PaginationParams) => Promise<PaginationConnection<T>>,
  mapResult: (node: T) => any | Promise<any>,
  queryParams?: Record<string, any>,
): Promise<PaginationResult<any>> {
  // Validate limit
  if (limit < 1) {
    throw new InvalidLimitError();
  }

  logger.debug(
    `Paginating with cursor: ${cursor}, limit: ${limit}, queryParams: ${JSON.stringify(queryParams)}`,
  );

  // Get the current page
  const connection = await fetchData({ first: limit, after: cursor });

  // If we got no results and there was a cursor, it means the cursor was invalid
  if (!connection.edges.length && cursor) {
    throw new InvalidCursorError();
  }

  // Get the previous page's cursor if we're not on the first page
  let previousUrl = null;
  if (cursor) {
    // We're on a page after the first page
    // If we're on the second page, the previous page is the first page
    // If we're on a later page, we need to query the previous page
    const previousPage = await fetchData({ last: limit, before: connection.edges[0].cursor });
    if (previousPage.edges.length > 0) {
      // If previous page has less than limit records, it means it's the first page
      if (previousPage.edges.length < limit) {
        previousUrl = buildUrl(requestUrl, { limit, ...queryParams });
      } else {
        // If previous page has exactly limit records, we need to check if it's the first page
        const firstPage = await fetchData({ first: limit });
        // If the first page's first cursor matches the previous page's first cursor,
        // it means the previous page is the first page
        if (firstPage.edges[0].cursor === previousPage.edges[0].cursor) {
          previousUrl = buildUrl(requestUrl, { limit, ...queryParams });
        } else {
          previousUrl = buildUrl(requestUrl, {
            cursor: previousPage.edges[0].cursor,
            limit,
            ...queryParams,
          });
        }
      }
    }
  }

  const results = connection.edges.map((edge) => mapResult(edge.node));
  const resolvedResults = await Promise.all(
    results.map((result) => (result instanceof Promise ? result : Promise.resolve(result))),
  );

  return {
    results: resolvedResults,
    next:
      connection.pageInfo.hasNextPage && connection.pageInfo.endCursor
        ? buildUrl(requestUrl, {
            cursor: connection.pageInfo.endCursor,
            limit,
            ...queryParams,
          })
        : null,
    previous: previousUrl,
  };
}
