import { gql } from '@apollo/client';

// Authenticated owner view — clientSecret is never returned by the server.
const SSO_PROVIDER_FIELDS = gql`
  fragment SsoProviderFields on SsoProviderModel {
    id
    projectId
    type
    name
    status
    issuer
    clientId
    authorizationUrl
    tokenUrl
    userInfoUrl
    createdAt
    updatedAt
  }
`;

// Project-level SSO settings: force-SSO enforcement + JIT provisioning policy.
const SSO_SETTINGS_FIELDS = gql`
  fragment ProjectSsoSettingsFields on ProjectSsoSettingsModel {
    projectId
    requireSso
    autoProvision
    defaultRole
    allowedDomains
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

export const getProjectSsoSettings = gql`
  query GetProjectSsoSettings($projectId: String!) {
    getProjectSsoSettings(projectId: $projectId) {
      ...ProjectSsoSettingsFields
    }
  }
  ${SSO_SETTINGS_FIELDS}
`;

export const updateProjectSsoSettings = gql`
  mutation UpdateProjectSsoSettings($projectId: String!, $input: UpdateProjectSsoSettingsInput!) {
    updateProjectSsoSettings(projectId: $projectId, input: $input) {
      ...ProjectSsoSettingsFields
    }
  }
  ${SSO_SETTINGS_FIELDS}
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

// Pre-auth: the SSO entry page reads the project's branding + active providers.
export const getProjectSsoLogin = gql`
  query GetProjectSsoLogin($projectId: String!) {
    getProjectSsoLogin(projectId: $projectId) {
      name
      logoUrl
      providers {
        id
        name
        type
      }
    }
  }
`;
