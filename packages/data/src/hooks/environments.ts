import { useMutation, NetworkStatus } from '@apollo/client';
import { useCallback } from 'react';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import {
  type CreateEnvironmentsMutationVariables,
  CreateEnvironmentsDocument,
  DeleteEnvironmentsDocument,
  UpdateEnvironmentsDocument,
  type UpdateEnvironmentsMutationVariables,
  UserEnvironmentsDocument,
  type UserEnvironmentsQuery,
  type UserEnvironmentsQueryVariables,
  VerifyInstallationDocument,
  type VerifyInstallationQuery,
  type VerifyInstallationQueryVariables,
} from '../graphql';

// Domain wrappers for `environments.graphql`: environments and the
// installation check.

export const useDeleteEnvironmentsMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteEnvironmentsDocument);
  const invoke = useCallback(
    async (id: string): Promise<boolean> => {
      const response = await mutation({
        variables: { id },
        update(cache) {
          cache.evict({ id: cache.identify({ __typename: 'Environment', id }) });
          cache.gc();
        },
      });
      return !!response.data?.deleteEnvironments?.id;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export type CreateEnvironmentInput = CreateEnvironmentsMutationVariables;

export const useCreateEnvironmentMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateEnvironmentsDocument, {
    refetchQueries: ['userEnvironments'],
  });
  const invoke = useCallback(
    async (input: CreateEnvironmentInput): Promise<string | undefined> => {
      const response = await mutation({ variables: input });
      return response.data?.createEnvironments?.id;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export type UpdateEnvironmentInput = UpdateEnvironmentsMutationVariables;

export const useUpdateEnvironmentMutation = () => {
  // setPrimary flips isPrimary on two rows; refetch covers the demoted one.
  // Plain rename auto-merges via __typename:id but we refetch anyway so
  // the caller doesn't need to know which path it took.
  const [mutation, { loading, error }] = useMutation(UpdateEnvironmentsDocument, {
    refetchQueries: ['userEnvironments'],
  });
  const invoke = useCallback(
    async (input: UpdateEnvironmentInput): Promise<boolean> => {
      const response = await mutation({ variables: input });
      return !!response.data?.updateEnvironments?.id;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useGetUserEnvironmentsQuery = (
  projectId: string | undefined,
  options?: TypedQueryOptions<UserEnvironmentsQuery, UserEnvironmentsQueryVariables>,
) => {
  const { data, refetch, loading, error, networkStatus } = useTypedQuery(UserEnvironmentsDocument, {
    variables: { projectId: projectId! },
    notifyOnNetworkStatusChange: true,
    skip: !projectId,
    ...options,
  });

  const isRefetching = networkStatus === NetworkStatus.refetch;
  const environmentList = data?.userEnvironments ?? null;

  return { environmentList, refetch, loading, error, isRefetching };
};

export const useVerifyInstallationQuery = (
  environmentId: string | undefined,
  options?: TypedQueryOptions<VerifyInstallationQuery, VerifyInstallationQueryVariables>,
) => {
  const { data, loading, error, refetch, stopPolling } = useTypedQuery(VerifyInstallationDocument, {
    variables: { environmentId: environmentId! },
    skip: !environmentId,
    ...options,
  });

  return {
    installed: (data?.verifyInstallation?.installed as boolean | undefined) ?? false,
    userCount: (data?.verifyInstallation?.userCount as number | undefined) ?? 0,
    loading,
    error,
    refetch,
    stopPolling,
  };
};
