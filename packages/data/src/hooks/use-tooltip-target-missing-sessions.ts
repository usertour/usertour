import { useCallback } from 'react';
import { useLazyQuery } from '@apollo/client';

import type { Pagination } from '@usertour/types';
import {
  type AnalyticsOrder,
  QueryTooltipTargetMissingSessionsDocument,
  type QueryTooltipTargetMissingSessionsQuery,
  type TooltipTargetMissingQuery,
} from '../graphql';

export type { TooltipTargetMissingQuery };

export type TooltipTargetMissingResponse =
  QueryTooltipTargetMissingSessionsQuery['queryTooltipTargetMissingSessions'];

/** One session of the report. */
export type TooltipTargetMissingSession = NonNullable<
  TooltipTargetMissingResponse['sessions']['edges']
>[number]['node'];

export type StepAnalytics = TooltipTargetMissingResponse['stepAnalytics'];

export const useQueryTooltipTargetMissingSessionsLazyQuery = () => {
  const [query, { loading }] = useLazyQuery(QueryTooltipTargetMissingSessionsDocument, {
    fetchPolicy: 'network-only',
  });

  const invoke = useCallback(
    async (
      queryParams: TooltipTargetMissingQuery,
      pagination: Pagination = { first: 10 },
      orderBy: AnalyticsOrder = { field: 'createdAt', direction: 'desc' },
    ): Promise<TooltipTargetMissingResponse | undefined> => {
      const response = await query({
        variables: { ...pagination, query: queryParams, orderBy },
      });
      return response.data?.queryTooltipTargetMissingSessions;
    },
    [query],
  );

  return { invoke, loading };
};
