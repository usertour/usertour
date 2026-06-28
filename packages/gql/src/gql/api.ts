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

// ── Personal API tokens (v2 / MCP) ─────────────────────────────────

export const ApiTokens = gql`
  query ApiTokens {
    apiTokens {
      id
      name
      partialKey
      scopes
      projectIds
      environmentIds
      isActive
      expiresAt
      lastUsedAt
      createdAt
    }
  }
`;

export const CreateApiToken = gql`
  mutation CreateApiToken($input: CreateApiTokenInput!) {
    createApiToken(input: $input) {
      token
      apiToken {
        id
        name
        partialKey
        scopes
        projectIds
        environmentIds
        isActive
        expiresAt
        createdAt
      }
    }
  }
`;

export const UpdateApiToken = gql`
  mutation UpdateApiToken($id: String!, $input: UpdateApiTokenInput!) {
    updateApiToken(id: $id, input: $input) {
      id
      name
      partialKey
      scopes
      projectIds
      environmentIds
      isActive
      expiresAt
      lastUsedAt
      createdAt
    }
  }
`;

export const RotateApiToken = gql`
  mutation RotateApiToken($id: String!) {
    rotateApiToken(id: $id) {
      token
      apiToken {
        id
        name
        partialKey
        scopes
        projectIds
        environmentIds
        isActive
        expiresAt
        lastUsedAt
        createdAt
      }
    }
  }
`;

export const DeleteApiToken = gql`
  mutation DeleteApiToken($id: String!) {
    deleteApiToken(id: $id)
  }
`;

// ── OAuth connected apps (Phase 3) ─────────────────────────────────

export const OAuthConnections = gql`
  query OAuthConnections {
    oauthConnections {
      id
      clientName
      projectId
      projectName
      scopes
      environmentNames
      createdAt
      lastUsedAt
    }
  }
`;

export const RevokeOAuthConnection = gql`
  mutation RevokeOAuthConnection($id: String!) {
    revokeOAuthConnection(id: $id)
  }
`;
