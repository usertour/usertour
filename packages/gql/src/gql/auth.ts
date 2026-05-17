import { gql } from '@apollo/client';

export const createMagicLink = gql`
  mutation createMagicLink($email: String!) {
    createMagicLink(data: { email: $email }) {
      id
      email
    }
  }
`;

export const resendMagicLink = gql`
  mutation resendMagicLink($id: String!) {
    resendMagicLink(data: { id: $id }) {
      id
      email
    }
  }
`;

export const signOut = gql`
  mutation SignOut {
    signOut @client
  }
`;

export const login = gql`
  mutation Login($email: String!, $password: String!, $inviteCode: String) {
    login(data: { email: $email, password: $password, inviteCode: $inviteCode }) {
      accessToken
      refreshToken
      requiresTwoFactor
      requiresTwoFactorSetup
      twoFactorChallenge
      user {
        id
        email
      }
    }
  }
`;

export const signUp = gql`
  mutation signUp(
    $code: String!
    $password: String!
    $userName: String!
    $isInvite: Boolean!
    $companyName: String
  ) {
    signup(
      data: {
        code: $code
        password: $password
        userName: $userName
        companyName: $companyName
        isInvite: $isInvite
      }
    ) {
      accessToken
      refreshToken
      requiresTwoFactor
      requiresTwoFactorSetup
      twoFactorChallenge
      user {
        id
        email
      }
    }
  }
`;

export const setupSystemAdmin = gql`
  mutation setupSystemAdmin($name: String!, $email: String!, $password: String!) {
    setupSystemAdmin(data: { name: $name, email: $email, password: $password }) {
      accessToken
      refreshToken
      user {
        id
        email
      }
    }
  }
`;

export const resetUserPassword = gql`
  mutation resetUserPassword($email: String!) {
    resetUserPassword(data: { email: $email }) {
      success
    }
  }
`;

export const updateUserPassword = gql`
  mutation resetUserPassword($email: String!) {
    resetUserPassword(data: { email: $email }) {
      success
    }
  }
`;

export const resetUserPasswordByCode = gql`
  mutation resetUserPasswordByCode($code: String!, $password: String!) {
    resetUserPasswordByCode(data: { code: $code, password: $password }) {
      success
    }
  }
`;

// ---------------------------------------------------------------------------
// Two-factor authentication
// ---------------------------------------------------------------------------

export const startTwoFactorSetup = gql`
  mutation StartTwoFactorSetup {
    startTwoFactorSetup {
      secret
      otpauthUri
      qrDataUri
    }
  }
`;

export const startTwoFactorSetupWithChallenge = gql`
  mutation StartTwoFactorSetupWithChallenge($challengeToken: String!) {
    startTwoFactorSetupWithChallenge(challengeToken: $challengeToken) {
      secret
      otpauthUri
      qrDataUri
    }
  }
`;

export const confirmTwoFactorSetup = gql`
  mutation ConfirmTwoFactorSetup($secret: String!, $code: String!) {
    confirmTwoFactorSetup(data: { secret: $secret, code: $code }) {
      recoveryCodes
    }
  }
`;

export const confirmTwoFactorSetupWithChallenge = gql`
  mutation ConfirmTwoFactorSetupWithChallenge(
    $secret: String!
    $code: String!
    $challengeToken: String!
  ) {
    confirmTwoFactorSetupWithChallenge(
      data: { secret: $secret, code: $code, challengeToken: $challengeToken }
    ) {
      recoveryCodes
      auth {
        accessToken
        refreshToken
        requiresTwoFactor
        requiresTwoFactorSetup
      }
    }
  }
`;

export const verifyTwoFactor = gql`
  mutation VerifyTwoFactor($challengeToken: String!, $code: String!, $isRecoveryCode: Boolean) {
    verifyTwoFactor(
      data: { challengeToken: $challengeToken, code: $code, isRecoveryCode: $isRecoveryCode }
    ) {
      accessToken
      refreshToken
    }
  }
`;

export const disableTwoFactor = gql`
  mutation DisableTwoFactor($code: String!, $isRecoveryCode: Boolean) {
    disableTwoFactor(data: { code: $code, isRecoveryCode: $isRecoveryCode })
  }
`;

export const regenerateRecoveryCodes = gql`
  mutation RegenerateRecoveryCodes($code: String!, $isRecoveryCode: Boolean) {
    regenerateRecoveryCodes(data: { code: $code, isRecoveryCode: $isRecoveryCode }) {
      recoveryCodes
    }
  }
`;
