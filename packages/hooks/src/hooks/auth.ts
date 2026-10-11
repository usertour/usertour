import { useMutation } from '@apollo/client';

import { type TypedQueryOptions, useTypedQuery } from '../query';
import {
  AcceptInviteDocument,
  ConfirmTwoFactorSetupDocument,
  ConfirmTwoFactorSetupWithChallengeDocument,
  CreateMagicLinkDocument,
  CreateOwnedProjectDocument,
  DisableTwoFactorDocument,
  GetInviteDocument,
  LoginDocument,
  LogoutDocument,
  MeDocument,
  MeQuery,
  MeQueryVariables,
  RegenerateRecoveryCodesDocument,
  ResendMagicLinkDocument,
  ResetUserPasswordByCodeDocument,
  ResetUserPasswordDocument,
  SetupSystemAdminDocument as setupSystemAdminMutation,
  SignUpDocument,
  StartTwoFactorSetupDocument,
  StartTwoFactorSetupWithChallengeDocument,
  VerifyTwoFactorDocument,
} from '@usertour/gql';

// Session / identity ---------------------------------------------------------

/** The signed-in user as the `me` query delivers them. */
export type CurrentUser = MeQuery['me'];

export const useGetUserInfoQuery = (
  uid?: string,
  options?: TypedQueryOptions<MeQuery, MeQueryVariables>,
) => {
  const { data, refetch, loading, refreshing, error } = useTypedQuery(MeDocument, {
    skip: !uid,
    // The one query that wants partial data: the user can resolve while
    // `projects` fails, and the session must not read as a failure. The
    // caller renders a failed project list in place (ADR 0021 §5).
    errorPolicy: 'all',
    notifyOnError: false,
    ...options,
  });
  return { data: data?.me, refetch, loading, refreshing, error };
};

export const useLogoutMutation = () => {
  const [mutation, { loading, error }] = useMutation(LogoutDocument);
  const invoke = async () => {
    const response = await mutation();
    return response.data?.logout;
  };
  return { invoke, loading, error };
};

export const useCreateOwnedProjectMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateOwnedProjectDocument);
  const invoke = async (name: string) => {
    const response = await mutation({ variables: { name } });
    return response.data?.createOwnedProject as { id: string; name: string } | undefined;
  };
  return { invoke, loading, error };
};

// Login / sign-up ------------------------------------------------------------

export type LoginMutationVariables = {
  email: string;
  password: string;
  inviteCode?: string;
};

export const useLoginMutation = () => {
  const [mutation, { loading, error }] = useMutation(LoginDocument);
  const invoke = async (variables: LoginMutationVariables) => {
    const response = await mutation({ variables });
    return response.data?.login;
  };
  return { invoke, loading, error };
};

export type SignupMutationVariables = {
  code: string;
  password: string;
  userName: string;
  companyName: string;
};

export const useSignupMutation = () => {
  const [mutation, { loading, error }] = useMutation(SignUpDocument);
  const invoke = async (variables: SignupMutationVariables) => {
    const response = await mutation({ variables });
    return response.data?.signup;
  };
  return { invoke, loading, error };
};

export type AcceptInviteMutationVariables = {
  code: string;
  password: string;
  userName: string;
};

export const useAcceptInviteMutation = () => {
  const [mutation, { loading, error }] = useMutation(AcceptInviteDocument);
  const invoke = async (variables: AcceptInviteMutationVariables) => {
    const response = await mutation({ variables });
    return response.data?.acceptInvite;
  };
  return { invoke, loading, error };
};

export const useCreateMagicLinkMutation = () => {
  const [mutation, { loading, error }] = useMutation(CreateMagicLinkDocument);
  const invoke = async (email: string) => {
    const response = await mutation({ variables: { email } });
    return response.data?.createMagicLink as { id: string; email: string } | undefined;
  };
  return { invoke, loading, error };
};

export const useResendMagicLinkMutation = () => {
  const [mutation, { loading, error }] = useMutation(ResendMagicLinkDocument);
  const invoke = async (id: string) => {
    const response = await mutation({ variables: { id } });
    return response.data?.resendMagicLink as { id: string; email: string } | undefined;
  };
  return { invoke, loading, error };
};

// Invite ---------------------------------------------------------------------

export const useGetInviteQuery = (inviteId: string) => {
  const { data, loading, error } = useTypedQuery(GetInviteDocument, {
    variables: { inviteId },
  });
  return { data: data?.getInvite, loading, error };
};

// First-run system admin setup -----------------------------------------------

export type SetupSystemAdminMutationVariables = {
  name: string;
  email: string;
  password: string;
};

export const useSetupSystemAdminMutation = () => {
  const [mutation, { loading, error }] = useMutation(setupSystemAdminMutation);
  const invoke = async (variables: SetupSystemAdminMutationVariables) => {
    const response = await mutation({ variables });
    return response.data?.setupSystemAdmin;
  };
  return { invoke, loading, error };
};

// Password reset -------------------------------------------------------------

export const useResetUserPasswordMutation = () => {
  const [mutation, { loading, error }] = useMutation(ResetUserPasswordDocument);
  const invoke = async (email: string) => {
    const response = await mutation({ variables: { email } });
    return response.data?.resetUserPassword as { success: boolean } | undefined;
  };
  return { invoke, loading, error };
};

export const useResetUserPasswordByCodeMutation = () => {
  const [mutation, { loading, error }] = useMutation(ResetUserPasswordByCodeDocument);
  const invoke = async (code: string, password: string) => {
    const response = await mutation({ variables: { code, password } });
    return response.data?.resetUserPasswordByCode;
  };
  return { invoke, loading, error };
};

// Two-factor authentication --------------------------------------------------

export type TwoFactorSetupPayload = {
  secret: string;
  otpauthUri: string;
  qrDataUri: string;
};

export const useStartTwoFactorSetupMutation = () => {
  const [mutation, { loading, error }] = useMutation(StartTwoFactorSetupDocument);
  const invoke = async (): Promise<TwoFactorSetupPayload | undefined> => {
    const response = await mutation();
    return response.data?.startTwoFactorSetup;
  };
  return { invoke, loading, error };
};

export const useStartTwoFactorSetupWithChallengeMutation = () => {
  const [mutation, { loading, error }] = useMutation(StartTwoFactorSetupWithChallengeDocument);
  const invoke = async (challengeToken: string): Promise<TwoFactorSetupPayload | undefined> => {
    const response = await mutation({ variables: { challengeToken } });
    return response.data?.startTwoFactorSetupWithChallenge;
  };
  return { invoke, loading, error };
};

export const useConfirmTwoFactorSetupMutation = () => {
  const [mutation, { loading, error }] = useMutation(ConfirmTwoFactorSetupDocument);
  const invoke = async (secret: string, code: string): Promise<string[] | undefined> => {
    const response = await mutation({ variables: { secret, code } });
    return response.data?.confirmTwoFactorSetup?.recoveryCodes;
  };
  return { invoke, loading, error };
};

export const useConfirmTwoFactorSetupWithChallengeMutation = () => {
  const [mutation, { loading, error }] = useMutation(ConfirmTwoFactorSetupWithChallengeDocument);
  const invoke = async (variables: { secret: string; code: string; challengeToken: string }) => {
    const response = await mutation({ variables });
    return response.data?.confirmTwoFactorSetupWithChallenge;
  };
  return { invoke, loading, error };
};

export const useVerifyTwoFactorMutation = () => {
  const [mutation, { loading, error }] = useMutation(VerifyTwoFactorDocument);
  const invoke = async (variables: {
    challengeToken: string;
    code: string;
    isRecoveryCode?: boolean;
  }) => {
    const response = await mutation({ variables });
    return response.data?.verifyTwoFactor;
  };
  return { invoke, loading, error };
};

export const useDisableTwoFactorMutation = () => {
  const [mutation, { loading, error }] = useMutation(DisableTwoFactorDocument);
  const invoke = async (code: string, isRecoveryCode = false): Promise<boolean> => {
    const response = await mutation({ variables: { code, isRecoveryCode } });
    return !!response.data?.disableTwoFactor;
  };
  return { invoke, loading, error };
};

export const useRegenerateRecoveryCodesMutation = () => {
  const [mutation, { loading, error }] = useMutation(RegenerateRecoveryCodesDocument);
  const invoke = async (code: string, isRecoveryCode = false): Promise<string[] | undefined> => {
    const response = await mutation({ variables: { code, isRecoveryCode } });
    return response.data?.regenerateRecoveryCodes?.recoveryCodes;
  };
  return { invoke, loading, error };
};
