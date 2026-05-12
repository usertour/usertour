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

export const GetSalesforceObjectFields = gql`
  query GetSalesforceObjectFields($integrationId: String!) {
    getSalesforceObjectFields(integrationId: $integrationId) {
      standardObjects {
        name
        label
        fields {
          name
          label
          type
          required
          unique
          referenceTo
          picklistValues {
            label
            value
          }
        }
      }
      customObjects {
        name
        label
        fields {
          name
          label
          type
          required
          unique
          referenceTo
          picklistValues {
            label
            value
          }
        }
      }
    }
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

export const GetIntegrationObjectMappings = gql`
  query GetIntegrationObjectMappings($integrationId: String!) {
    getIntegrationObjectMappings(integrationId: $integrationId) {
      id
      sourceObjectType
      destinationObjectType
      enabled
      isSyncing
      lastSyncedAt
      settings
      integrationId
      createdAt
      updatedAt
    }
  }
`;

export const GetIntegrationObjectMapping = gql`
  query GetIntegrationObjectMapping($id: String!) {
    getIntegrationObjectMapping(id: $id) {
      id
      sourceObjectType
      destinationObjectType
      enabled
      isSyncing
      lastSyncedAt
      settings
      integrationId
      integration {
        id
        provider
        enabled
      }
      createdAt
      updatedAt
    }
  }
`;

export const UpsertIntegrationObjectMapping = gql`
  mutation UpsertIntegrationObjectMapping($integrationId: String!, $input: CreateIntegrationObjectMappingInput!) {
    upsertIntegrationObjectMapping(integrationId: $integrationId, input: $input) {
      id
      sourceObjectType
      destinationObjectType
      enabled
      isSyncing
      lastSyncedAt
      settings
      integrationId
      createdAt
      updatedAt
    }
  }
`;

export const UpdateIntegrationObjectMapping = gql`
  mutation UpdateIntegrationObjectMapping($id: String!, $input: UpdateIntegrationObjectMappingInput!) {
    updateIntegrationObjectMapping(id: $id, input: $input) {
      id
      sourceObjectType
      destinationObjectType
      enabled
      isSyncing
      lastSyncedAt
      settings
      integrationId
      createdAt
      updatedAt
    }
  }
`;

export const DeleteIntegrationObjectMapping = gql`
  mutation DeleteIntegrationObjectMapping($id: String!) {
    deleteIntegrationObjectMapping(id: $id)
  }
`;
