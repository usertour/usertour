import { gql } from '@apollo/client';

export const ListAccessTokens = gql`
  query ListAccessTokens($projectId: String!) {
    listAccessTokens(projectId: $projectId) {
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
