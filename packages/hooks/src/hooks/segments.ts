import { NetworkStatus } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';

import type { Segment } from '@usertour/types';
import {
  ListSegmentDocument,
  type ListSegmentQuery,
  type ListSegmentQueryVariables,
} from '@usertour/gql';

// Domain wrapper for `listSegment`. Lives outside the catch-all
// `gql.ts` per the convention established by `themes.ts` /
// `access-tokens.ts` etc.
export const useListSegmentsQuery = (
  environmentId: string | undefined,
  options?: TypedQueryOptions<ListSegmentQuery, ListSegmentQueryVariables>,
) => {
  const { data, refetch, loading, error, networkStatus } = useTypedQuery(ListSegmentDocument, {
    variables: { environmentId: environmentId! },
    skip: !environmentId,
    notifyOnNetworkStatusChange: true,
    ...options,
  });

  return {
    segmentList: data?.listSegment as Segment[] | undefined,
    refetch,
    loading,
    error,
    isRefetching: networkStatus === NetworkStatus.refetch,
  };
};
