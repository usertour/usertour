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
//
// `segmentList` is undefined until the list has loaded, never an empty
// array standing in for it: the conditions validator reads undefined as
// "not loaded, skip the existence check" and an array as "loaded, look the
// segment up", so an empty stand-in would reject every segment condition
// during the load. Callers filter by bizType themselves.
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
