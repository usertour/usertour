import { gql } from '@apollo/client';

export const ListAccessTokens = gql`
  query ListAccessTokens($environmentId: String!) {
    listAccessTokens(environmentId: $environmentId) {
      id
      name
      accessToken
      createdAt
      isActive
      expiresAt
      lastUsedAt
      description
    }
  }
`;

export const CreateAccessToken = gql`
  mutation CreateAccessToken($environmentId: String!, $input: CreateAccessTokenInput!) {
    createAccessToken(environmentId: $environmentId, input: $input) {
      id
      name
      accessToken
      createdAt
      isActive
      expiresAt
      description
    }
  }
`;

export const DeleteAccessToken = gql`
  mutation DeleteAccessToken($environmentId: String!, $accessTokenId: String!) {
    deleteAccessToken(environmentId: $environmentId, accessTokenId: $accessTokenId)
  }
`;

export const GetAccessToken = gql`
  query GetAccessToken($environmentId: String!, $accessTokenId: String!) {
    getAccessToken(environmentId: $environmentId, accessTokenId: $accessTokenId)
  }
`;
