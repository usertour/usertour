import { gql } from '@apollo/client';

export const ListIntegrations = gql`
  query ListIntegrations($environmentId: String!) {
    listIntegrations(environmentId: $environmentId) {
      id
      code
      key
      config
      enabled
      createdAt
      updatedAt  
    }
  }
`;

export const UpdateIntegration = gql`
  mutation UpdateIntegration($environmentId: String!, $code: String!, $input: UpdateIntegrationInput!) {
    updateIntegration(environmentId: $environmentId, code: $code, input: $input) {
      id
      code
      key
      config
      enabled
      createdAt
      updatedAt
    }
  }
`;
