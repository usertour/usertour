import { NetworkStatus, useMutation } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import {
  type ApiTokenFieldsFragment,
  ApiTokensDocument,
  type ApiTokensQuery,
  type ApiTokensQueryVariables,
  CreateApiTokenDocument,
  type CreateApiTokenInput as CreateApiTokenInputWire,
  type CreateApiTokenMutation,
  DeleteApiTokenDocument,
  RotateApiTokenDocument,
  UpdateApiTokenDocument,
  type UpdateApiTokenInput as UpdateApiTokenInputWire,
} from '../graphql';

export type ApiToken = ApiTokenFieldsFragment;

/** `environmentIds` omitted = all environments; the form sends an explicit set. */
export type CreateApiTokenInput = CreateApiTokenInputWire;

/**
 * `environmentIds` is three-state: absent = keep, null = clear (back to "all
 * environments"), array = replace.
 */
export type UpdateApiTokenInput = UpdateApiTokenInputWire;

/** The plaintext token (`utp_…`) is shown once, at creation. */
export type CreatedApiToken = CreateApiTokenMutation['createApiToken'];

export const useListApiTokensQuery = (
  options?: TypedQueryOptions<ApiTokensQuery, ApiTokensQueryVariables>,
) => {
  const { data, loading, error, refetch, networkStatus } = useTypedQuery(ApiTokensDocument, {
    notifyOnNetworkStatusChange: true,
    ...options,
  });
  const isRefetching = networkStatus === NetworkStatus.refetch;
  const apiTokens = data?.apiTokens;
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
    return response.data?.createApiToken ?? null;
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
    return response.data?.updateApiToken ?? null;
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
