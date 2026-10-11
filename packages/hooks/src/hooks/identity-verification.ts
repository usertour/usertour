import { useCallback } from 'react';
import { NetworkStatus, useLazyQuery, useMutation } from '@apollo/client';
import { type TypedQueryOptions, useTypedQuery } from '../query';
import type { Refined } from './refined';
import {
  CreateSigningSecretDocument,
  GetIdentityVerificationStatsDocument,
  type GetIdentityVerificationStatsQuery,
  type GetIdentityVerificationStatsQueryVariables,
  GetSigningSecretDocument,
  ListSigningSecretsDocument,
  type ListSigningSecretsQuery,
  type ListSigningSecretsQueryVariables,
  RevokeSigningSecretDocument,
  SetRequireIdentityVerificationDocument,
  type SigningSecretFieldsFragment,
  ValidateIdentityTokenDocument,
  type ValidateIdentityTokenQuery,
} from '@usertour/gql';

/** `secret` is masked in list responses; the full value only comes from create/get. */
export type SigningSecret = SigningSecretFieldsFragment;

/** Counters for one subject: 'user' or 'company'. */
export type IdentityVerificationStats =
  GetIdentityVerificationStatsQuery['getIdentityVerificationStats'][number];

export const useListSigningSecretsQuery = (
  environmentId: string | undefined,
  options?: TypedQueryOptions<ListSigningSecretsQuery, ListSigningSecretsQueryVariables>,
) => {
  const { data, loading, error, refetch, networkStatus } = useTypedQuery(
    ListSigningSecretsDocument,
    {
      variables: { environmentId: environmentId! },
      skip: !environmentId,
      notifyOnNetworkStatusChange: true,
      ...options,
    },
  );

  const isRefetching = networkStatus === NetworkStatus.refetch;
  const signingSecrets = data?.listSigningSecrets;
  return { signingSecrets, loading, error, refetch, isRefetching };
};

export const useCreateSigningSecretMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateSigningSecretDocument, {
    // The response carries the full plaintext secret; keep it out of the
    // normalized cache (same rationale as useGetSigningSecretLazyQuery).
    // The masked list updates via the refetch, not the cache write.
    fetchPolicy: 'no-cache',
    refetchQueries: ['ListSigningSecrets'],
  });
  // Returns the full secret so the caller can show it in the reveal dialog.
  const invoke = useCallback(
    async (environmentId: string): Promise<SigningSecret | null> => {
      const response = await mutation({ variables: { environmentId } });
      return response.data?.createSigningSecret ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useRevokeSigningSecretMutation = () => {
  const [mutation, { loading, error }] = useMutation(RevokeSigningSecretDocument);
  const invoke = useCallback(
    async (environmentId: string, signingSecretId: string): Promise<boolean> => {
      const response = await mutation({
        variables: { environmentId, signingSecretId },
        // Server response is just a boolean; evict the revoked entity directly.
        update(cache) {
          cache.evict({
            id: cache.identify({ __typename: 'EnvironmentSigningSecret', id: signingSecretId }),
          });
          cache.gc();
        },
      });
      return !!response.data?.revokeSigningSecret;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useGetSigningSecretLazyQuery = () => {
  const [query, { loading, error }] = useLazyQuery(GetSigningSecretDocument, {
    // The full secret value must not linger in the normalized cache.
    fetchPolicy: 'no-cache',
  });
  const invoke = useCallback(
    async (environmentId: string, signingSecretId: string): Promise<string | null> => {
      const response = await query({ variables: { environmentId, signingSecretId } });
      return response.data?.getSigningSecret ?? null;
    },
    [query],
  );
  return { invoke, loading, error };
};

export const useSetRequireIdentityVerificationMutation = () => {
  // Returns the updated Environment with requireIdentityVerification, so the
  // normalized cache refreshes every consumer without a refetch.
  const [mutation, { loading, error }] = useMutation(SetRequireIdentityVerificationDocument);
  const invoke = useCallback(
    async (environmentId: string, required: boolean): Promise<boolean> => {
      const response = await mutation({ variables: { environmentId, required } });
      return !!response.data?.setRequireIdentityVerification;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export type IdentityTokenStatus =
  | 'valid'
  | 'expired'
  | 'not_yet_valid'
  | 'invalid_signature'
  | 'wrong_algorithm'
  | 'malformed'
  | 'missing_subject'
  | 'no_active_secret';

/** `status` is a String on the wire; the server keeps it to the set above. */
export type IdentityTokenDiagnosis = Refined<
  ValidateIdentityTokenQuery['validateIdentityToken'],
  { status: IdentityTokenStatus }
>;

export const useValidateIdentityTokenLazyQuery = () => {
  const [query, { loading, error }] = useLazyQuery(ValidateIdentityTokenDocument, {
    // Diagnostic tool — always hit the server, never answer from cache.
    fetchPolicy: 'no-cache',
  });
  const invoke = useCallback(
    async (environmentId: string, token: string): Promise<IdentityTokenDiagnosis | null> => {
      const response = await query({ variables: { environmentId, token } });
      return (response.data?.validateIdentityToken as IdentityTokenDiagnosis | undefined) ?? null;
    },
    [query],
  );
  return { invoke, loading, error };
};

export const useGetIdentityVerificationStatsQuery = (
  environmentId: string | undefined,
  options?: TypedQueryOptions<
    GetIdentityVerificationStatsQuery,
    GetIdentityVerificationStatsQueryVariables
  >,
) => {
  const { data, loading, error, refetch } = useTypedQuery(GetIdentityVerificationStatsDocument, {
    variables: { environmentId: environmentId! },
    skip: !environmentId,
    ...options,
  });
  const stats = data?.getIdentityVerificationStats;
  return { stats, loading, error, refetch };
};
