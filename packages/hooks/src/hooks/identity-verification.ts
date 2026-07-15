import { useCallback } from 'react';
import {
  NetworkStatus,
  type QueryHookOptions,
  useLazyQuery,
  useMutation,
  useQuery,
} from '@apollo/client';
import {
  CreateSigningSecret,
  GetIdentityVerificationStats,
  GetSigningSecret,
  ListSigningSecrets,
  RevokeSigningSecret,
  SetRequireIdentityVerification,
  ValidateIdentityToken,
} from '@usertour/gql';

export interface SigningSecret {
  id: string;
  /** Masked in list responses; full value only from create/get. */
  secret: string;
  createdAt: string;
  lastUsedAt?: string | null;
}

export interface IdentityVerificationStats {
  subject: 'user' | 'company';
  valid: number;
  invalid: number;
  missing: number;
  anonymous: number;
}

export const useListSigningSecretsQuery = (
  environmentId: string | undefined,
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch, networkStatus } = useQuery(ListSigningSecrets, {
    variables: { environmentId },
    skip: !environmentId,
    notifyOnNetworkStatusChange: true,
    ...options,
  });

  const isRefetching = networkStatus === NetworkStatus.refetch;
  const signingSecrets = data?.listSigningSecrets as SigningSecret[] | undefined;
  return { signingSecrets, loading, error, refetch, isRefetching };
};

export const useCreateSigningSecretMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateSigningSecret, {
    refetchQueries: ['ListSigningSecrets'],
  });
  // Returns the full secret so the caller can show it in the reveal dialog.
  const invoke = useCallback(
    async (environmentId: string): Promise<SigningSecret | null> => {
      const response = await mutation({ variables: { environmentId } });
      return (response.data?.createSigningSecret as SigningSecret | undefined) ?? null;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export const useRevokeSigningSecretMutation = () => {
  const [mutation, { loading, error }] = useMutation(RevokeSigningSecret);
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
  const [query, { loading, error }] = useLazyQuery(GetSigningSecret, {
    // The full secret value must not linger in the normalized cache.
    fetchPolicy: 'no-cache',
  });
  const invoke = useCallback(
    async (environmentId: string, signingSecretId: string): Promise<string | null> => {
      const response = await query({ variables: { environmentId, signingSecretId } });
      return (response.data?.getSigningSecret as string | undefined) ?? null;
    },
    [query],
  );
  return { invoke, loading, error };
};

export const useSetRequireIdentityVerificationMutation = () => {
  // Returns the updated Environment with requireIdentityVerification, so the
  // normalized cache refreshes every consumer without a refetch.
  const [mutation, { loading, error }] = useMutation(SetRequireIdentityVerification);
  const invoke = useCallback(
    async (environmentId: string, required: boolean): Promise<boolean> => {
      const response = await mutation({ variables: { environmentId, required } });
      return !!response.data?.setRequireIdentityVerification;
    },
    [mutation],
  );
  return { invoke, loading, error };
};

export interface IdentityTokenDiagnosis {
  status: 'valid' | 'expired' | 'invalid_signature' | 'malformed' | 'missing_subject';
  subject?: string | null;
  companyId?: string | null;
  expiresAt?: string | null;
}

export const useValidateIdentityTokenLazyQuery = () => {
  const [query, { loading, error }] = useLazyQuery(ValidateIdentityToken, {
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
  options?: QueryHookOptions,
) => {
  const { data, loading, error, refetch } = useQuery(GetIdentityVerificationStats, {
    variables: { environmentId },
    skip: !environmentId,
    ...options,
  });
  const stats = data?.getIdentityVerificationStats as IdentityVerificationStats[] | undefined;
  return { stats, loading, error, refetch };
};
