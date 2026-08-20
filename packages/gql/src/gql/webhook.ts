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
      consecutiveFailures
      cooldownUntil
      autoDisabledAt
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
      consecutiveFailures
      cooldownUntil
      autoDisabledAt
    }
  }
`;

export const QueryWebhookMessages = gql`
  query QueryWebhookMessages($webhookId: String!, $first: Int, $after: String) {
    queryWebhookMessages(webhookId: $webhookId, first: $first, after: $after) {
      totalCount
      edges {
        cursor
        node {
          id
          createdAt
          updatedAt
          topic
          status
          payload
          deliveries {
            id
            createdAt
            attempt
            success
            responseStatus
            responseBody
            error
            durationMs
          }
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

// Returns every field the server may change — including the breaker state a
// URL change or re-enable resets — so the normalized cache updates list AND
// detail without a refetch (docs/conventions/apollo-cache-mutations.md).
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
      consecutiveFailures
      cooldownUntil
      autoDisabledAt
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
      updatedAt
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

export const ResendWebhookMessage = gql`
  mutation ResendWebhookMessage($data: WebhookMessageInput!) {
    resendWebhookMessage(data: $data) {
      id
      status
    }
  }
`;
