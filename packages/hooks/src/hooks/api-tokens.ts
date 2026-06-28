import { NetworkStatus, type QueryHookOptions, useMutation, useQuery } from '@apollo/client';
import {
  ApiTokens,
  CreateApiToken,
  DeleteApiToken,
  RotateApiToken,
  UpdateApiToken,
} from '@usertour/gql';

export interface ApiToken {
  id: string;
  name: string;
  /** Trailing characters of the secret, for display only. */
  partialKey: string;
  scopes: string[];
  projectIds: string[];
  /** Environments this token may act on; null/absent = all environments. */
  environmentIds: string[] | null;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateApiTokenInput {
  name: string;
  projectIds: string[];
  scopes: string[];
  /** Environments this token may act on. Omit → all (the form sends an explicit set). */
  environmentIds?: string[];
  expiresAt?: string | null;
}

export interface UpdateApiTokenInput {
  name?: string;
  projectIds?: string[];
  scopes?: string[];
  environmentIds?: string[];
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

export const useUpdateApiTokenMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateApiToken, {
    refetchQueries: ['ApiTokens'],
  });
  // Returns the updated record, or null on failure.
  const invoke = async (id: string, input: UpdateApiTokenInput): Promise<ApiToken | null> => {
    const response = await mutation({ variables: { id, input } });
    return (response.data?.updateApiToken as ApiToken | undefined) ?? null;
  };
  return { invoke, loading, error };
};

export const useRotateApiTokenMutation = () => {
  // Rotating mints a new secret on the same record; the plaintext is shown
  // once (like create). Refetch so the masked tail updates in the list.
  const [mutation, { loading, error }] = useMutation(RotateApiToken, {
    refetchQueries: ['ApiTokens'],
  });
  const invoke = async (id: string): Promise<CreatedApiToken | null> => {
    const response = await mutation({ variables: { id } });
    return response.data?.rotateApiToken ?? null;
  };
  return { invoke, loading, error };
};

export const useDeleteApiTokenMutation = () => {
  // Hard delete; refetch evicts the row from the list.
  const [mutation, { loading, error }] = useMutation(DeleteApiToken, {
    refetchQueries: ['ApiTokens'],
  });
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.deleteApiToken;
  };
  return { invoke, loading, error };
};
