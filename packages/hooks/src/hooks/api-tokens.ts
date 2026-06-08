import { NetworkStatus, type QueryHookOptions, useMutation, useQuery } from '@apollo/client';
import { ApiTokens, CreateApiToken, RevokeApiToken } from '@usertour/gql';

export interface ApiToken {
  id: string;
  name: string;
  /** Trailing characters of the secret, for display only. */
  partialKey: string;
  scopes: string[];
  projectIds: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateApiTokenInput {
  name: string;
  projectIds: string[];
  scopes: string[];
  expiresAt?: string | null;
}

export interface CreatedApiToken {
  /** The full plaintext token (`utp_…`). Shown once at creation. */
  token: string;
  apiToken: ApiToken;
}

export const useListApiTokensQuery = (options?: QueryHookOptions) => {
  const { data, loading, error, refetch, networkStatus } = useQuery(ApiTokens, {
    notifyOnNetworkStatusChange: true,
    ...options,
  });
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const apiTokens = data?.apiTokens as ApiToken[] | undefined;
  return { apiTokens, loading, error, refetch, isRefetching };
};

export const useCreateApiTokenMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateApiToken, {
    refetchQueries: ['ApiTokens'],
  });
  // Returns the freshly-minted plaintext token (shown once) plus the record, or
  // null on failure. The API only surfaces the secret at creation time.
  const invoke = async (input: CreateApiTokenInput): Promise<CreatedApiToken | null> => {
    const response = await mutation({ variables: { input } });
    return response.data?.createApiToken ?? null;
  };
  return { invoke, loading, error };
};

export const useRevokeApiTokenMutation = () => {
  // Revoke is a soft deactivate (isActive=false); refetch so the row reflects
  // the new state rather than evicting it from the cache.
  const [mutation, { loading, error }] = useMutation(RevokeApiToken, {
    refetchQueries: ['ApiTokens'],
  });
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.revokeApiToken;
  };
  return { invoke, loading, error };
};
