import { useCallback } from 'react';
import { useLazyQuery } from '@apollo/client';

import type { Pagination } from '@usertour/types';
import type { Refined } from './refined';
import {
  type AnalyticsOrder,
  QueryTooltipTargetMissingSessionsDocument,
  type QueryTooltipTargetMissingSessionsQuery,
  type TooltipTargetMissingQuery,
} from '@usertour/gql';

export type { TooltipTargetMissingQuery };

type ResponseWire = QueryTooltipTargetMissingSessionsQuery['queryTooltipTargetMissingSessions'];
type SessionWire = NonNullable<ResponseWire['sessions']['edges']>[number]['node'];
type EventWire = NonNullable<SessionWire['bizEvent']>[number];

/** One session of the report. `bizUser.data` and `bizEvent[].data` travel as JSON. */
export type TooltipTargetMissingSession = Refined<
  SessionWire,
  {
    bizUser: Refined<SessionWire['bizUser'], { data: Record<string, unknown> }>;
    bizEvent: Array<Refined<EventWire, { data: Record<string, unknown> }>> | null;
  }
>;

export type TooltipTargetMissingResponse = Refined<
  ResponseWire,
  {
    sessions: Refined<
      ResponseWire['sessions'],
      { edges: Array<{ cursor: string; node: TooltipTargetMissingSession }> | null }
    >;
  }
>;

export type StepAnalytics = ResponseWire['stepAnalytics'];

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
      return response.data?.queryTooltipTargetMissingSessions as
        | TooltipTargetMissingResponse
        | undefined;
    },
    [query],
  );

  return { invoke, loading };
};
