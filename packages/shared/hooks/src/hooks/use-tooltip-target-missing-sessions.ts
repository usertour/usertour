import { useCallback } from 'react';
import { useLazyQuery } from '@apollo/client';
import { queryTooltipTargetMissingSessions } from '@usertour-packages/gql';
import type { Pagination } from '@usertour/types';

export interface TooltipTargetMissingQuery {
  environmentId: string;
  contentId: string;
  startDate: string;
  endDate: string;
  timezone: string;
  stepCvid: string;
}

export const useQueryTooltipTargetMissingSessionsLazyQuery = () => {
  const [query, { loading }] = useLazyQuery(queryTooltipTargetMissingSessions, {
    fetchPolicy: 'network-only',
  });

  const invoke = useCallback(
    async (
      queryParams: TooltipTargetMissingQuery,
      pagination: Pagination = { first: 10 },
      orderBy: { field: string; direction: 'asc' | 'desc' } = {
        field: 'createdAt',
        direction: 'desc',
      },
    ) => {
      const response = await query({
        variables: {
          ...pagination,
          query: queryParams,
          orderBy,
        },
      });
      return response.data?.queryTooltipTargetMissingSessions;
    },
    [query],
  );

  return { invoke, loading };
};
