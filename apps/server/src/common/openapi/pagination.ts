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
    endCursor: string | null;
    hasPreviousPage?: boolean;
    startCursor?: string | null;
  };
}

const logger = new Logger('Pagination');

export async function paginate<T>(
  apiUrl: string,
  endpoint: string,
  environmentId: string,
  cursor: string | undefined,
  limit: number,
  fetchData: (params: PaginationParams) => Promise<PaginationConnection<T>>,
  mapResult: (node: T) => any,
): Promise<PaginationResult<any>> {
  // Validate limit
  if (limit < 1) {
    throw new InvalidLimitError();
  }

  logger.debug(
    `Paginating ${endpoint} with environmentId: ${environmentId}, cursor: ${cursor}, limit: ${limit}`,
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
    // We're on a page after the first page, need to query the previous page
    const previousPage = await fetchData({ last: limit, before: connection.edges[0].cursor });
    if (previousPage.edges.length > 0) {
      // If previous page has less than limit records, it means it's the first page
      if (previousPage.edges.length < limit) {
        previousUrl = `${apiUrl}/v1/${endpoint}?limit=${limit}`;
      } else {
        // If previous page has exactly limit records, we need to check if it's the first page
        const firstPage = await fetchData({ first: limit });
        // If the first page's first cursor matches the previous page's first cursor,
        // it means the previous page is the first page
        if (firstPage.edges[0].cursor === previousPage.edges[0].cursor) {
          previousUrl = `${apiUrl}/v1/${endpoint}?limit=${limit}`;
        } else {
          previousUrl = `${apiUrl}/v1/${endpoint}?cursor=${previousPage.edges[0].cursor}&limit=${limit}`;
        }
      }
    }
  }

  return {
    results: connection.edges.map((edge) => mapResult(edge.node)),
    next:
      connection.pageInfo.hasNextPage && connection.pageInfo.endCursor
        ? `${apiUrl}/v1/${endpoint}?cursor=${connection.pageInfo.endCursor}&limit=${limit}`
        : null,
    previous: previousUrl,
  };
}
