import { gql } from '@apollo/client';

export const ListIntegrations = gql`
  query ListIntegrations($environmentId: String!) {
    listIntegrations(environmentId: $environmentId) {
      id
      provider
      key
      config
      enabled
      accessToken
      createdAt
      updatedAt  
    }
  }
`;

export const UpdateIntegration = gql`
  mutation UpdateIntegration($environmentId: String!, $provider: String!, $input: UpdateIntegrationInput!) {
    updateIntegration(environmentId: $environmentId, provider: $provider, input: $input) {
      id
      provider
      key
      config
      enabled
      accessToken
      createdAt
      updatedAt
    }
  }
`;

export const GetSalesforceAuthUrl = gql`
  query GetSalesforceAuthUrl($environmentId: String!, $provider: String!) {
    getSalesforceAuthUrl(environmentId: $environmentId, provider: $provider)
  }
`;

export const GetIntegration = gql`
  query GetIntegration($environmentId: String!, $provider: String!) {
    getIntegration(environmentId: $environmentId, provider: $provider) {
      id
      provider
      key
      config
      enabled
      accessToken
      integrationOAuth {
        data
      }
      createdAt
      updatedAt
    }
  }
`;

export const DisconnectIntegration = gql`
  mutation DisconnectIntegration($environmentId: String!, $provider: String!) {
    disconnectIntegration(environmentId: $environmentId, provider: $provider) {
      id
    }
  }
`;
