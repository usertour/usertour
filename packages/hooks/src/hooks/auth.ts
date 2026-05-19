import { QueryHookOptions, useMutation, useQuery } from '@apollo/client';
import {
  acceptInvite,
  confirmTwoFactorSetup,
  confirmTwoFactorSetupWithChallenge,
  createMagicLink,
  disableTwoFactor,
  getInvite,
  getUserInfo,
  login,
  logout,
  regenerateRecoveryCodes,
  resendMagicLink,
  resetUserPassword,
  resetUserPasswordByCode,
  setupSystemAdmin as setupSystemAdminMutation,
  signUp,
  startTwoFactorSetup,
  startTwoFactorSetupWithChallenge,
  verifyTwoFactor,
} from '@usertour/gql';

// Session / identity ---------------------------------------------------------

export const useGetUserInfoQuery = (uid?: string, options?: QueryHookOptions) => {
  const { data, refetch, loading, error } = useQuery(getUserInfo, {
    skip: !uid,
    ...options,
  });
  return { data: data?.me, refetch, loading, error };
};

export const useLogoutMutation = () => {
  const [mutation, { loading, error }] = useMutation(logout);
  const invoke = async () => {
    const response = await mutation();
    return response.data?.logout;
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
  const [mutation, { loading, error }] = useMutation(login);
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
  const [mutation, { loading, error }] = useMutation(signUp);
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
  const [mutation, { loading, error }] = useMutation(acceptInvite);
  const invoke = async (variables: AcceptInviteMutationVariables) => {
    const response = await mutation({ variables });
    return response.data?.acceptInvite;
  };
  return { invoke, loading, error };
};

export const useCreateMagicLinkMutation = () => {
  const [mutation, { loading, error }] = useMutation(createMagicLink);
  const invoke = async (email: string) => {
    const response = await mutation({ variables: { email } });
    return response.data?.createMagicLink as { id: string; email: string } | undefined;
  };
  return { invoke, loading, error };
};

export const useResendMagicLinkMutation = () => {
  const [mutation, { loading, error }] = useMutation(resendMagicLink);
  const invoke = async (id: string) => {
    const response = await mutation({ variables: { id } });
    return response.data?.resendMagicLink as { id: string; email: string } | undefined;
  };
  return { invoke, loading, error };
};

// Invite ---------------------------------------------------------------------

export const useGetInviteQuery = (inviteId: string) => {
  const { data, loading, error } = useQuery(getInvite, {
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
  const [mutation, { loading, error }] = useMutation(resetUserPassword);
  const invoke = async (email: string) => {
    const response = await mutation({ variables: { email } });
    return response.data?.resetUserPassword as { success: boolean } | undefined;
  };
  return { invoke, loading, error };
};

export const useResetUserPasswordByCodeMutation = () => {
  const [mutation, { loading, error }] = useMutation(resetUserPasswordByCode);
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
  const [mutation, { loading, error }] = useMutation(startTwoFactorSetup);
  const invoke = async (): Promise<TwoFactorSetupPayload | undefined> => {
    const response = await mutation();
    return response.data?.startTwoFactorSetup;
  };
  return { invoke, loading, error };
};

export const useStartTwoFactorSetupWithChallengeMutation = () => {
  const [mutation, { loading, error }] = useMutation(startTwoFactorSetupWithChallenge);
  const invoke = async (challengeToken: string): Promise<TwoFactorSetupPayload | undefined> => {
    const response = await mutation({ variables: { challengeToken } });
    return response.data?.startTwoFactorSetupWithChallenge;
  };
  return { invoke, loading, error };
};

export const useConfirmTwoFactorSetupMutation = () => {
  const [mutation, { loading, error }] = useMutation(confirmTwoFactorSetup);
  const invoke = async (secret: string, code: string): Promise<string[] | undefined> => {
    const response = await mutation({ variables: { secret, code } });
    return response.data?.confirmTwoFactorSetup?.recoveryCodes;
  };
  return { invoke, loading, error };
};

export const useConfirmTwoFactorSetupWithChallengeMutation = () => {
  const [mutation, { loading, error }] = useMutation(confirmTwoFactorSetupWithChallenge);
  const invoke = async (variables: { secret: string; code: string; challengeToken: string }) => {
    const response = await mutation({ variables });
    return response.data?.confirmTwoFactorSetupWithChallenge;
  };
  return { invoke, loading, error };
};

export const useVerifyTwoFactorMutation = () => {
  const [mutation, { loading, error }] = useMutation(verifyTwoFactor);
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
  const [mutation, { loading, error }] = useMutation(disableTwoFactor);
  const invoke = async (code: string, isRecoveryCode = false): Promise<boolean> => {
    const response = await mutation({ variables: { code, isRecoveryCode } });
    return !!response.data?.disableTwoFactor;
  };
  return { invoke, loading, error };
};

export const useRegenerateRecoveryCodesMutation = () => {
  const [mutation, { loading, error }] = useMutation(regenerateRecoveryCodes);
  const invoke = async (code: string, isRecoveryCode = false): Promise<string[] | undefined> => {
    const response = await mutation({ variables: { code, isRecoveryCode } });
    return response.data?.regenerateRecoveryCodes?.recoveryCodes;
  };
  return { invoke, loading, error };
};
