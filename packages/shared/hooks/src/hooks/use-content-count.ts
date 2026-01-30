import { useQuery, type QueryHookOptions } from '@apollo/client';
import { queryContent } from '@usertour-packages/gql';
import type { ContentDataType } from '@usertour/types';

interface UseContentCountOptions {
  environmentId?: string;
  type?: ContentDataType | string;
  published?: boolean;
  skip?: boolean;
  options?: Omit<QueryHookOptions, 'variables' | 'skip'>;
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
  const { data, loading, error, refetch } = useQuery(queryContent, {
    variables: {
      first: 1, // Minimal fetch, we only need totalCount
      query: { environmentId, type, published },
      orderBy: DEFAULT_ORDER_BY,
    },
    skip: skip || !environmentId,
    fetchPolicy: 'cache-first',
    ...options,
  });

  return {
    totalCount: data?.queryContent?.totalCount ?? 0,
    isLoading: loading,
    error,
    refetch,
  };
};
