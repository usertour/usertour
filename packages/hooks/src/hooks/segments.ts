import { NetworkStatus } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';

import {
  ListSegmentDocument,
  type ListSegmentQuery,
  type ListSegmentQueryVariables,
  type SegmentFieldsFragment,
} from '@usertour/gql';

/** A segment as the segment list returns it (the `SegmentFields` fragment). */
export type Segment = SegmentFieldsFragment;

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
    segmentList: data?.listSegment,
    refetch,
    loading,
    error,
    isRefetching: networkStatus === NetworkStatus.refetch,
  };
};
