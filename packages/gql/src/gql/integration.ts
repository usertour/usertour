import { gql } from '@apollo/client';

// The Integration type has NO key field (the API never returns the credential);
// `keyTail` is the display stand-in.
export const ListIntegrations = gql`
  query ListIntegrations($environmentId: String!) {
    listIntegrations(environmentId: $environmentId) {
      id
      createdAt
      updatedAt
      environmentId
      provider
      keyTail
      config
      enabled
      consecutiveFailures
      cooldownUntil
      autoDisabledAt
      inboundEnabled
      inboundConfig
      inboundUrl
    }
  }
`;

export const QueryIntegrationMessages = gql`
  query QueryIntegrationMessages($integrationId: String!, $first: Int, $after: String) {
    queryIntegrationMessages(integrationId: $integrationId, first: $first, after: $after) {
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

// Returns every field the server may change — including the breaker state a
// key/config change or re-enable resets — so the normalized cache updates list
// AND detail without a refetch (docs/conventions/apollo-cache-mutations.md).
export const UpsertIntegration = gql`
  mutation UpsertIntegration($data: UpsertIntegrationInput!) {
    upsertIntegration(data: $data) {
      id
      createdAt
      updatedAt
      environmentId
      provider
      keyTail
      config
      enabled
      consecutiveFailures
      cooldownUntil
      autoDisabledAt
      inboundEnabled
      inboundConfig
      inboundUrl
    }
  }
`;

// Returns the fields an inbound write can change (first enable mints the
// receive token, so inboundUrl flips null → value) — the normalized cache
// updates in place, no refetch (docs/conventions/apollo-cache-mutations.md).
export const UpdateIntegrationInbound = gql`
  mutation UpdateIntegrationInbound($data: UpdateIntegrationInboundInput!) {
    updateIntegrationInbound(data: $data) {
      id
      updatedAt
      inboundEnabled
      inboundConfig
      inboundUrl
    }
  }
`;

export const RotateIntegrationInboundToken = gql`
  mutation RotateIntegrationInboundToken($data: IntegrationIdInput!) {
    rotateIntegrationInboundToken(data: $data) {
      id
      updatedAt
      inboundUrl
    }
  }
`;

export const QueryIntegrationSyncedSegments = gql`
  query QueryIntegrationSyncedSegments($integrationId: String!) {
    queryIntegrationSyncedSegments(integrationId: $integrationId) {
      id
      createdAt
      sourceCohortId
      sourceCohortName
      segmentId
      segmentName
      lastSyncedAt
      memberCount
      unresolvedCount
    }
  }
`;

export const DeleteIntegration = gql`
  mutation DeleteIntegration($data: IntegrationIdInput!) {
    deleteIntegration(data: $data) {
      id
    }
  }
`;

export const SendIntegrationTestEvent = gql`
  mutation SendIntegrationTestEvent($data: IntegrationIdInput!) {
    sendIntegrationTestEvent(data: $data) {
      id
    }
  }
`;
