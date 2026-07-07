import { NetworkStatus, type QueryHookOptions, useMutation, useQuery } from '@apollo/client';
import {
  CreateAccessToken,
  DeleteAccessToken,
  GetAccessToken,
  ListAccessTokens,
  ProjectHasEnvironmentAccessTokens,
} from '@usertour/gql';

export interface AccessToken {
  id: string;
  name: string;
  accessToken: string;
  createdAt: string;
}

export const useCreateAccessTokenMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateAccessToken, {
    refetchQueries: ['ListAccessTokens'],
  });
  // Returns the freshly-minted secret so the caller can show it in the
  // reveal dialog. `null` on failure — the API only surfaces the token
  // string at creation time, so losing it here means re-creating.
  const invoke = async (environmentId: string, name: string): Promise<string | null> => {
    const response = await mutation({
      variables: { environmentId, input: { name } },
    });
    return response.data?.createAccessToken?.accessToken ?? null;
  };
  return { invoke, loading, error };
};

export const useListAccessTokensQuery = (
  environmentId: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch, networkStatus } = useQuery(ListAccessTokens, {
    variables: { environmentId },
    skip: !environmentId,
    notifyOnNetworkStatusChange: true,
    ...options,
  });

  const isRefetching = networkStatus === NetworkStatus.refetch;
  const accessTokens = data?.listAccessTokens as AccessToken[] | undefined;
  return { accessTokens, loading, error, refetch, isRefetching };
};

/**
 * Whether the project holds any environment access key. Backs the deprecated
 * env-key "API" settings item, which is project-level: the per-environment
 * {@link useListAccessTokensQuery} can't tell whether ANOTHER environment still
 * has keys, so switching to a keyless environment would otherwise hide the item
 * while keys remain elsewhere.
 */
export const useProjectHasEnvironmentAccessTokensQuery = (
  projectId: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch } = useQuery(ProjectHasEnvironmentAccessTokens, {
    variables: { projectId },
    skip: !projectId,
    ...options,
  });

  const hasEnvironmentAccessTokens = data?.projectHasEnvironmentAccessTokens as boolean | undefined;
  return { hasEnvironmentAccessTokens, loading, error, refetch };
};

export const useDeleteAccessTokenMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteAccessToken);
  const invoke = async (environmentId: string, accessTokenId: string): Promise<boolean> => {
    const response = await mutation({
      variables: { environmentId, accessTokenId },
      // Server response is just a boolean; we already know the id from
      // the caller, so evict that entity from the cache directly.
      update(cache) {
        cache.evict({ id: cache.identify({ __typename: 'AccessToken', id: accessTokenId }) });
        cache.gc();
      },
    });
    return !!response.data?.deleteAccessToken;
  };
  return { invoke, loading, error };
};

export const useGetAccessTokenQuery = (
  environmentId: string,
  accessTokenId: string,
  options?: QueryHookOptions,
) => {
  const { data, loading, error } = useQuery(GetAccessToken, {
    variables: { environmentId, accessTokenId },
    ...options,
  });
  return { data: data?.getAccessToken, loading, error };
};
