import { NetworkStatus, useMutation } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import type { ColumnSetting, RulesCondition } from '@usertour/types';

import {
  ListSegmentDocument,
  type ListSegmentQuery,
  type ListSegmentQueryVariables,
  type SegmentFieldsFragment,
  CreateBizCompanyOnSegmentDocument,
  type CreateBizCompanyOnSegmentMutationVariables,
  CreateBizUserOnSegmentDocument,
  type CreateBizUserOnSegmentMutationVariables,
  CreateSegmentDocument,
  type CreateSegmentMutationVariables,
  DeleteBizCompanyOnSegmentDocument,
  type DeleteBizCompanyOnSegmentMutationVariables,
  DeleteBizUserOnSegmentDocument,
  DeleteSegmentDocument,
  UpdateSegmentDocument,
} from '../graphql';
import { useCallback } from 'react';

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

export const useDeleteSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteSegmentDocument);
  const invoke = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await mutation({
        variables: { id },
        update(cache) {
          cache.evict({ id: cache.identify({ __typename: 'Segment', id }) });
          cache.gc();
        },
      });
      return !!response.data?.deleteSegment?.success;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

// Server's UpdateSegment input picks { name, data, id, columns } from
// Segment — all optional except id. Wrapper mirrors that so the same
// invoke handles both filter-condition saves and column-setting saves.
//
// Refresh path is `refetchQueries: ['listSegment']`, NOT Apollo
// auto-merge. The UpdateSegmentDocument gql response only selects `{ id }`
// (`updateSegment` in packages/data/src/documents/segments.graphql), so auto-merge into the cached
// Segment entity is a no-op. To migrate to auto-merge later, expand
// the gql response to mirror listSegment's selection set, then drop
// refetchQueries here.
export const useUpdateSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateSegmentDocument, {
    refetchQueries: ['listSegment'],
  });
  const invoke = useCallback(
    async (data: {
      id: string;
      name?: string;
      data?: RulesCondition[];
      columns?: ColumnSetting[];
    }): Promise<boolean> => {
      const response = await mutation({ variables: { data } });
      return !!response.data?.updateSegment?.id;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useDeleteBizUserOnSegmentMutation = () => {
  // Removes a relationship, not the user itself — the user entity stays
  // in cache, but the segment's view of users needs to be refetched
  // because Apollo can't infer "this user is no longer in this segment"
  // from a count response.
  const [mutation, { loading, error }] = useMutation(DeleteBizUserOnSegmentDocument, {
    refetchQueries: ['queryBizUser'],
  });
  const invoke = useCallback(
    async (data: {
      bizUserIds: string[];
      segmentId: string;
    }): Promise<{
      success: boolean;
      count: number;
    }> => {
      const response = await mutation({ variables: { data } });
      return {
        success: !!response.data?.deleteBizUserOnSegment?.success,
        count: response.data?.deleteBizUserOnSegment?.count ?? 0,
      };
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useCreateSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateSegmentDocument, {
    refetchQueries: ['listSegment'],
  });
  const invoke = useCallback(
    (variables: CreateSegmentMutationVariables) => mutation({ variables }),
    [mutation],
  );
  return { invoke, loading, error };
};

export const useCreateBizUserOnSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateBizUserOnSegmentDocument, {
    refetchQueries: ['queryBizUser'],
  });
  const invoke = useCallback(
    (variables: CreateBizUserOnSegmentMutationVariables) => mutation({ variables }),
    [mutation],
  );
  return { invoke, loading, error };
};

export const useCreateBizCompanyOnSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateBizCompanyOnSegmentDocument, {
    refetchQueries: ['queryBizCompany'],
  });
  const invoke = useCallback(
    (variables: CreateBizCompanyOnSegmentMutationVariables) => mutation({ variables }),
    [mutation],
  );
  return { invoke, loading, error };
};

export const useDeleteBizCompanyOnSegmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteBizCompanyOnSegmentDocument, {
    refetchQueries: ['queryBizCompany'],
  });
  const invoke = useCallback(
    (variables: DeleteBizCompanyOnSegmentMutationVariables) => mutation({ variables }),
    [mutation],
  );
  return { invoke, loading, error };
};
