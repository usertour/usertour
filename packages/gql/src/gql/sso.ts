import { gql } from '@apollo/client';

// Authenticated owner view — clientSecret is never returned by the server.
const SSO_PROVIDER_FIELDS = gql`
  fragment SsoProviderFields on SsoProviderModel {
    id
    projectId
    type
    name
    status
    defaultRole
    allowedDomains
    issuer
    clientId
    authorizationUrl
    tokenUrl
    userInfoUrl
    createdAt
    updatedAt
  }
`;

export const listProjectSsoProviders = gql`
  query ListProjectSsoProviders($projectId: String!) {
    listProjectSsoProviders(projectId: $projectId) {
      ...SsoProviderFields
    }
  }
  ${SSO_PROVIDER_FIELDS}
`;

export const createOidcSsoProvider = gql`
  mutation CreateOidcSsoProvider($projectId: String!, $input: CreateOidcSsoProviderInput!) {
    createOidcSsoProvider(projectId: $projectId, input: $input) {
      ...SsoProviderFields
    }
  }
  ${SSO_PROVIDER_FIELDS}
`;

export const updateSsoProvider = gql`
  mutation UpdateSsoProvider($id: String!, $input: UpdateSsoProviderInput!) {
    updateSsoProvider(id: $id, input: $input) {
      ...SsoProviderFields
    }
  }
  ${SSO_PROVIDER_FIELDS}
`;

export const deleteSsoProvider = gql`
  mutation DeleteSsoProvider($id: String!) {
    deleteSsoProvider(id: $id)
  }
`;

// Pre-auth: the project's SSO login page reads its active providers (no secrets).
export const getProjectSsoProviders = gql`
  query GetProjectSsoProviders($projectId: String!) {
    getProjectSsoProviders(projectId: $projectId) {
      id
      name
      type
    }
  }
`;
