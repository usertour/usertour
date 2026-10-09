import { NetworkStatus, useMutation } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import {
  ApiTokensDocument,
  type ApiTokensQuery,
  type ApiTokensQueryVariables,
  CreateApiTokenDocument,
  DeleteApiTokenDocument,
  RotateApiTokenDocument,
  UpdateApiTokenDocument,
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
  /** Three-state: absent = keep, null = clear (back to "all environments"), array = replace. */
  environmentIds?: string[] | null;
}

export interface CreatedApiToken {
  /** The full plaintext token (`utp_…`). Shown once at creation. */
  token: string;
  apiToken: ApiToken;
}

export const useListApiTokensQuery = (
  options?: TypedQueryOptions<ApiTokensQuery, ApiTokensQueryVariables>,
) => {
  const { data, loading, error, refetch, networkStatus } = useTypedQuery(ApiTokensDocument, {
    notifyOnNetworkStatusChange: true,
    ...options,
  });
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const apiTokens = data?.apiTokens as ApiToken[] | undefined;
  return { apiTokens, loading, error, refetch, isRefetching };
};

export const useCreateApiTokenMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateApiTokenDocument, {
    refetchQueries: ['ApiTokens'],
  });
  // Returns the freshly-minted plaintext token (shown once) plus the record, or
  // null on failure. The API only surfaces the secret at creation time.
  const invoke = async (input: CreateApiTokenInput): Promise<CreatedApiToken | null> => {
    const response = await mutation({ variables: { input } });
    return (response.data?.createApiToken as CreatedApiToken | undefined) ?? null;
  };
  return { invoke, loading, error };
};

export const useUpdateApiTokenMutation = () => {
  const [mutation, { loading, error }] = useMutation(UpdateApiTokenDocument, {
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
  const [mutation, { loading, error }] = useMutation(RotateApiTokenDocument, {
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
  const [mutation, { loading, error }] = useMutation(DeleteApiTokenDocument, {
    refetchQueries: ['ApiTokens'],
  });
  const invoke = async (id: string): Promise<boolean> => {
    const response = await mutation({ variables: { id } });
    return !!response.data?.deleteApiToken;
  };
  return { invoke, loading, error };
};
