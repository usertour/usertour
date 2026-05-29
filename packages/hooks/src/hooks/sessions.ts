import { type QueryHookOptions, useQuery } from '@apollo/client';
import { queryBizSession } from '@usertour/gql';
import type { BizSession, PageInfo, Pagination } from '@usertour/types';

// Domain wrapper for `queryBizSession`. The cursor-state book-keeping
// the table needs (currentPageInfo / pageCount derivation) lives in the
// apps/web caller — same split as `useContentListQuery` /
// `useContentList`.

interface QueryBizSessionVariables {
  environmentId: string;
  contentId: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

interface UseQueryBizSessionsArgs {
  query: QueryBizSessionVariables;
  pagination?: Pagination;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  options?: QueryHookOptions;
}

export const useQueryBizSessionsQuery = ({
  query,
  orderBy = { field: 'createdAt', direction: 'desc' },
  pagination = { first: 10 },
  options,
}: UseQueryBizSessionsArgs) => {
  const { data, refetch, error, loading } = useQuery(queryBizSession, {
    variables: {
      ...pagination,
      query,
      orderBy,
    },
    ...options,
  });

  const connection = data?.queryBizSession;
  const bizSessions: BizSession[] =
    connection?.edges?.map((edge: { node: BizSession }) => edge.node) ?? [];
  const pageInfo: PageInfo | undefined = connection?.pageInfo;
  const totalCount: number = connection?.totalCount ?? 0;

  return { bizSessions, pageInfo, totalCount, refetch, error, loading };
};
