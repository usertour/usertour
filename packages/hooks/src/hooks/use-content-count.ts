import { type TypedQueryOptions, useTypedQuery } from '../query';

import type { ContentDataType } from '@usertour/types';
import {
  type ContentOrder,
  QueryContentDocument,
  type QueryContentQuery,
  type QueryContentQueryVariables,
} from '@usertour/gql';

interface UseContentCountOptions {
  environmentId?: string;
  type?: ContentDataType | string;
  published?: boolean;
  skip?: boolean;
  options?: Omit<
    TypedQueryOptions<QueryContentQuery, QueryContentQueryVariables>,
    'variables' | 'skip'
  >;
}

// Default orderBy required by the GraphQL query
const DEFAULT_ORDER_BY = { field: 'createdAt', direction: 'desc' };

/**
 * Lightweight hook to get content count without fetching full data.
 * Useful for checking if content exists in a specific state (e.g., draft vs published).
 */
export const useContentCount = ({
  environmentId,
  type,
  published,
  skip = false,
  options,
}: UseContentCountOptions) => {
  const effectiveSkip = skip || !environmentId;
  const { data, loading, error, refetch } = useTypedQuery(QueryContentDocument, {
    variables: {
      first: 1, // Minimal fetch, we only need totalCount
      // effectiveSkip guards environmentId.
      query: { environmentId: environmentId!, type, published },
      orderBy: DEFAULT_ORDER_BY as ContentOrder,
    },
    skip: effectiveSkip,
    // Use cache-and-network so draft count is always fresh when e.g. in Published view
    fetchPolicy: 'cache-and-network',
    ...options,
  });

  return {
    totalCount: data?.queryContent?.totalCount ?? 0,
    isLoading: loading,
    error,
    refetch,
  };
};
