import { NetworkStatus, type QueryHookOptions, useQuery } from '@apollo/client';
import { listSegment } from '@usertour/gql';
import type { Segment } from '@usertour/types';

// Domain wrapper for `listSegment`. Lives outside the catch-all
// `gql.ts` per the convention established by `themes.ts` /
// `access-tokens.ts` etc.
export const useListSegmentsQuery = (
  environmentId: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, refetch, loading, error, networkStatus } = useQuery(listSegment, {
    variables: { environmentId },
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
