import { NetworkStatus, type QueryHookOptions, useMutation, useQuery } from '@apollo/client';
import {
  CreateAccessToken,
  DeleteAccessToken,
  GetAccessToken,
  ListAccessTokens,
} from '@usertour/gql';

export interface AccessToken {
  id: string;
  name: string;
  accessToken: string;
  createdAt: string;
}

export const useCreateAccessTokenMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateAccessToken);
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

export const useListAccessTokensQuery = (environmentId: string | undefined) => {
  const { data, loading, error, refetch, networkStatus } = useQuery(ListAccessTokens, {
    variables: { environmentId },
    skip: !environmentId,
    notifyOnNetworkStatusChange: true,
  });

  const isRefetching = networkStatus === NetworkStatus.refetch;
  const accessTokens = data?.listAccessTokens as AccessToken[] | undefined;
  return { accessTokens, loading, error, refetch, isRefetching };
};

export const useDeleteAccessTokenMutation = () => {
  const [mutation, { loading, error }] = useMutation(DeleteAccessToken);
  const invoke = async (environmentId: string, accessTokenId: string): Promise<boolean> => {
    const response = await mutation({
      variables: { environmentId, accessTokenId },
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
