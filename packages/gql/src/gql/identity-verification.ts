import { gql } from '@apollo/client';

export const ListSigningSecrets = gql`
  query ListSigningSecrets($environmentId: String!) {
    listSigningSecrets(environmentId: $environmentId) {
      id
      secret
      createdAt
      lastUsedAt
    }
  }
`;

export const GetSigningSecret = gql`
  query GetSigningSecret($environmentId: String!, $signingSecretId: String!) {
    getSigningSecret(environmentId: $environmentId, signingSecretId: $signingSecretId)
  }
`;

export const CreateSigningSecret = gql`
  mutation CreateSigningSecret($environmentId: String!) {
    createSigningSecret(environmentId: $environmentId) {
      id
      secret
      createdAt
      lastUsedAt
    }
  }
`;

export const RevokeSigningSecret = gql`
  mutation RevokeSigningSecret($environmentId: String!, $signingSecretId: String!) {
    revokeSigningSecret(environmentId: $environmentId, signingSecretId: $signingSecretId)
  }
`;

export const SetRequireIdentityVerification = gql`
  mutation SetRequireIdentityVerification($environmentId: String!, $required: Boolean!) {
    setRequireIdentityVerification(environmentId: $environmentId, required: $required) {
      id
      name
      token
      isPrimary
      requireIdentityVerification
    }
  }
`;

export const GetIdentityVerificationStats = gql`
  query GetIdentityVerificationStats($environmentId: String!) {
    getIdentityVerificationStats(environmentId: $environmentId) {
      subject
      valid
      invalid
      missing
      anonymous
    }
  }
`;

export const ValidateIdentityToken = gql`
  query ValidateIdentityToken($environmentId: String!, $token: String!) {
    validateIdentityToken(environmentId: $environmentId, token: $token) {
      status
      subject
      companyId
      expiresAt
    }
  }
`;
