import { gql } from '@apollo/client';

// The list query deliberately omits `secret` — it is surfaced on the detail
// page only (GetWebhook), mirroring the server-side exposure hygiene.
export const ListWebhooks = gql`
  query ListWebhooks($environmentId: String!) {
    listWebhooks(environmentId: $environmentId) {
      id
      createdAt
      updatedAt
      environmentId
      url
      topics
      enabled
      description
    }
  }
`;

export const GetWebhook = gql`
  query GetWebhook($id: String!) {
    getWebhook(id: $id) {
      id
      createdAt
      updatedAt
      environmentId
      url
      topics
      enabled
      secret
      description
    }
  }
`;

export const QueryWebhookDeliveries = gql`
  query QueryWebhookDeliveries($webhookId: String!, $first: Int, $after: String) {
    queryWebhookDeliveries(webhookId: $webhookId, first: $first, after: $after) {
      totalCount
      edges {
        cursor
        node {
          id
          createdAt
          messageId
          topic
          attempt
          success
          responseStatus
          error
          durationMs
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

export const CreateWebhook = gql`
  mutation CreateWebhook($data: CreateWebhookInput!) {
    createWebhook(data: $data) {
      id
      createdAt
      updatedAt
      environmentId
      url
      topics
      enabled
      description
    }
  }
`;

export const UpdateWebhook = gql`
  mutation UpdateWebhook($data: UpdateWebhookInput!) {
    updateWebhook(data: $data) {
      id
      createdAt
      updatedAt
      environmentId
      url
      topics
      enabled
      description
    }
  }
`;

export const DeleteWebhook = gql`
  mutation DeleteWebhook($data: WebhookIdInput!) {
    deleteWebhook(data: $data) {
      id
    }
  }
`;

export const RotateWebhookSecret = gql`
  mutation RotateWebhookSecret($data: WebhookIdInput!) {
    rotateWebhookSecret(data: $data) {
      id
      secret
    }
  }
`;

export const SendWebhookTestEvent = gql`
  mutation SendWebhookTestEvent($data: WebhookIdInput!) {
    sendWebhookTestEvent(data: $data) {
      id
    }
  }
`;
