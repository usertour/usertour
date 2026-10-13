import { useMutation } from '@apollo/client';
import { useCallback } from 'react';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import {
  CreateCheckoutSessionDocument,
  CreatePortalSessionDocument,
  GetSubscriptionByProjectIdDocument,
  type GetSubscriptionByProjectIdQuery,
  type GetSubscriptionByProjectIdQueryVariables,
  GetSubscriptionUsageDocument,
  type GetSubscriptionUsageQuery,
  type GetSubscriptionUsageQueryVariables,
} from '../graphql';

// Domain wrappers for `subscription.graphql`: billing sessions and the subscription.

export const useCreateCheckoutSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateCheckoutSessionDocument);
  const invoke = useCallback(
    async (data: {
      projectId: string;
      planType: string;
      interval: string;
    }): Promise<string | undefined> => {
      const response = await mutation({ variables: { data } });
      return response.data?.createCheckoutSession;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useCreatePortalSessionMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreatePortalSessionDocument);
  const invoke = useCallback(
    async (projectId: string): Promise<string | undefined> => {
      const response = await mutation({ variables: { projectId } });
      return response.data?.createPortalSession;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useGetSubscriptionByProjectIdQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<
    GetSubscriptionByProjectIdQuery,
    GetSubscriptionByProjectIdQueryVariables
  >,
) => {
  const { data, loading, error, refetch } = useTypedQuery(GetSubscriptionByProjectIdDocument, {
    variables: { projectId: projectId! },
    skip: !projectId,
    ...options,
  });
  const subscription = data?.getSubscriptionByProjectId ?? null;
  return { subscription, loading, error, refetch };
};

export const useGetSubscriptionUsageQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<GetSubscriptionUsageQuery, GetSubscriptionUsageQueryVariables>,
) => {
  const { data, loading, error, refetch } = useTypedQuery(GetSubscriptionUsageDocument, {
    variables: { projectId: projectId! },
    skip: !projectId,
    ...options,
  });
  const usage = data?.getSubscriptionUsage ?? 0;
  return { usage, loading, error, refetch };
};
