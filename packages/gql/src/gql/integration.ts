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
      connected
      remoteAccountId
      remoteAccountLabel
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
      connected
      remoteAccountId
      remoteAccountLabel
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

// CRM connections (ADR 0013). Start returns the provider authorize URL — the
// browser navigates there and comes back through the server callback, which
// creates the row; the detail page refetches on return.
export const StartCrmOAuth = gql`
  mutation StartCrmOAuth($data: StartCrmOAuthInput!) {
    startCrmOAuth(data: $data) {
      url
    }
  }
`;

// Returns every field a disconnect changes (grant dropped, switch off) plus
// the breaker fields a reconnect would reset, so the cache updates in place.
export const DisconnectCrmIntegration = gql`
  mutation DisconnectCrmIntegration($data: IntegrationIdInput!) {
    disconnectCrmIntegration(data: $data) {
      id
      updatedAt
      enabled
      connected
      remoteAccountId
      remoteAccountLabel
      consecutiveFailures
      cooldownUntil
      autoDisabledAt
    }
  }
`;

// CRM object mappings (ADR 0013 §4-6).
const MAPPING_FIELDS = `
  id
  createdAt
  updatedAt
  integrationId
  remoteObject
  localObject
  matchStrategy
  matchRemoteField
  inboundFields
  outboundFields
  enabled
  lastFullSyncAt
  fullSyncStartedAt
  matchedCount
  unresolvedCount
`;

export const ListIntegrationObjectMappings = gql`
  query ListIntegrationObjectMappings($integrationId: String!) {
    listIntegrationObjectMappings(integrationId: $integrationId) { ${MAPPING_FIELDS} }
  }
`;

// Live provider metadata: no cache (network-only) — the editor should see a
// property the customer just created in the CRM.
export const ListCrmRemoteProperties = gql`
  query ListCrmRemoteProperties($integrationId: String!, $remoteObject: String!) {
    listCrmRemoteProperties(integrationId: $integrationId, remoteObject: $remoteObject) {
      name
      label
      type
      fieldType
      groupName
      readOnly
      hubspotDefined
    }
  }
`;

export const UpsertIntegrationObjectMapping = gql`
  mutation UpsertIntegrationObjectMapping($data: UpsertIntegrationObjectMappingInput!) {
    upsertIntegrationObjectMapping(data: $data) { ${MAPPING_FIELDS} }
  }
`;

export const DeleteIntegrationObjectMapping = gql`
  mutation DeleteIntegrationObjectMapping($data: IntegrationObjectMappingIdInput!) {
    deleteIntegrationObjectMapping(data: $data)
  }
`;

// Manual full sync (ADR 0013 §7): returns the mapping with its round state so
// the card can show "in progress" without a refetch.
export const RunIntegrationObjectMappingSync = gql`
  mutation RunIntegrationObjectMappingSync($data: IntegrationObjectMappingIdInput!) {
    runIntegrationObjectMappingSync(data: $data) { ${MAPPING_FIELDS} }
  }
`;
