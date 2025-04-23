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
  mutation DeleteAccessToken($id: String!) {
    deleteAccessToken(id: $id)
  }
`;

export const GetAccessToken = gql`
  query GetAccessToken($id: String!) {
    getAccessToken(id: $id)
  }
`;
