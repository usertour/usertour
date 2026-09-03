import { EventAttributes } from '@usertour/types';
import type { AnalyticsIntegrationProvider, IntegrationConfig } from '@usertour/types';
import {
  AMPLITUDE_API_ENDPOINT,
  AMPLITUDE_API_ENDPOINT_EU,
  HEAP_API_ENDPOINT,
  MIXPANEL_API_ENDPOINT,
  MIXPANEL_API_ENDPOINT_EU,
  POSTHOG_API_ENDPOINT_EU,
  POSTHOG_API_ENDPOINT_US,
  SEGMENT_API_ENDPOINT,
  SEGMENT_API_ENDPOINT_EU,
} from '@/common/consts/endpoint';
import { IntegrationMessageEnvelope, ProviderAdapter, ProviderRequest } from './integrations.types';

/**
 * Provider adapter registry (ADR 0011 §4): each adapter is a pure function
 * from (canonical envelope, plaintext key, config) to one HTTP request. Two
 * invariants every adapter upholds:
 *
 * - **Event time, not delivery time**: timestamps come from the envelope's
 *   `createdAt` (the event's own time), so a retried delivery lands at the
 *   moment the event happened.
 * - **The message id is the idempotency key** where the provider offers one
 *   (Mixpanel `$insert_id`, Amplitude `insert_id`, Segment `messageId`) —
 *   at-least-once retries dedup on the destination side.
 *
 * All destinations are fixed public HTTPS hosts — no user-supplied URLs, so
 * the egress guard is not engaged (see the ADR for the custom-host rule).
 */

const regionEndpoint = (config: IntegrationConfig, us: string, eu: string): string =>
  config.region === 'EU' ? eu : us;

/**
 * Session attribute name per content type, keyed by the content-id attribute
 * the event already carries (each build*BaseEventData writes exactly one of
 * these — no event mixes types; survey answers carry flow_id and correctly
 * land on flow_session_id). Inside the product the canonical link is the
 * BizEvent.bizSessionId column; these names exist for the integration wire.
 */
const SESSION_ATTRIBUTE_BY_CONTENT_ID: ReadonlyArray<[string, string]> = [
  [EventAttributes.FLOW_ID, EventAttributes.FLOW_SESSION_ID],
  [EventAttributes.CHECKLIST_ID, EventAttributes.CHECKLIST_SESSION_ID],
  [EventAttributes.LAUNCHER_ID, EventAttributes.LAUNCHER_SESSION_ID],
  [EventAttributes.BANNER_ID, EventAttributes.BANNER_SESSION_ID],
  [EventAttributes.RESOURCE_CENTER_ID, EventAttributes.RESOURCE_CENTER_SESSION_ID],
];

const sessionAttributeName = (attributes: Record<string, unknown>): string => {
  const match = SESSION_ATTRIBUTE_BY_CONTENT_ID.find(
    ([contentIdKey]) => contentIdKey in attributes,
  );
  return match ? match[1] : 'session_id';
};

/**
 * The properties every provider receives: the analytics attributes plus the
 * Usertour session id — top-level on the envelope, absent from the attribute
 * blob — so a user's runs through the same content group into sessions on
 * the destination side. Named per content type (flow_session_id, ...) to
 * match the event-attribute vocabulary.
 */
const eventProperties = (
  event: IntegrationMessageEnvelope['data']['event'],
): Record<string, unknown> => ({
  ...event.attributes,
  ...(event.sessionId ? { [sessionAttributeName(event.attributes)]: event.sessionId } : {}),
});

const amplitude: ProviderAdapter = (envelope, key, config) => {
  const { event } = envelope.data;
  return {
    url: `${regionEndpoint(config, AMPLITUDE_API_ENDPOINT, AMPLITUDE_API_ENDPOINT_EU)}/batch`,
    body: {
      api_key: key,
      events: [
        {
          event_type: event.codeName,
          user_id: event.userId,
          time: Date.parse(envelope.createdAt),
          insert_id: envelope.id,
          event_properties: eventProperties(event),
        },
      ],
    },
  };
};

const heap: ProviderAdapter = (envelope, key) => {
  const { event } = envelope.data;
  return {
    url: `${HEAP_API_ENDPOINT}/api/track`,
    body: {
      app_id: key,
      identity: event.userId,
      event: event.codeName,
      timestamp: envelope.createdAt,
      properties: eventProperties(event),
    },
  };
};

const mixpanel: ProviderAdapter = (envelope, key, config) => {
  const { event } = envelope.data;
  return {
    url: `${regionEndpoint(config, MIXPANEL_API_ENDPOINT, MIXPANEL_API_ENDPOINT_EU)}/track`,
    body: [
      {
        event: event.codeName,
        properties: {
          ...eventProperties(event),
          distinct_id: event.userId,
          token: key,
          time: Math.floor(Date.parse(envelope.createdAt) / 1000),
          $insert_id: envelope.id,
        },
      },
    ],
  };
};

const posthog: ProviderAdapter = (envelope, key, config) => {
  const { event } = envelope.data;
  return {
    url: `${regionEndpoint(config, POSTHOG_API_ENDPOINT_US, POSTHOG_API_ENDPOINT_EU)}/i/v0/e/`,
    body: {
      api_key: key,
      event: event.codeName,
      distinct_id: event.userId,
      timestamp: envelope.createdAt,
      properties: eventProperties(event),
    },
  };
};

const segment: ProviderAdapter = (envelope, key, config) => {
  const { event } = envelope.data;
  return {
    url: `${regionEndpoint(config, SEGMENT_API_ENDPOINT, SEGMENT_API_ENDPOINT_EU)}/v1/track`,
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
    },
    body: {
      event: event.codeName,
      userId: event.userId,
      properties: eventProperties(event),
      timestamp: envelope.createdAt,
      messageId: envelope.id,
    },
  };
};

/** Analytics destinations only — CRM providers (ADR 0013) deliver through the CRM sync module. */
export const INTEGRATION_ADAPTERS: Record<AnalyticsIntegrationProvider, ProviderAdapter> = {
  amplitude,
  heap,
  mixpanel,
  posthog,
  segment,
};

/** The adapter for a stored provider value, or null for an unknown one. */
export const resolveAdapter = (provider: string): ProviderAdapter | null =>
  Object.prototype.hasOwnProperty.call(INTEGRATION_ADAPTERS, provider)
    ? INTEGRATION_ADAPTERS[provider as AnalyticsIntegrationProvider]
    : null;

/** Build the provider request for one delivery — the processor's only entry. */
export const buildProviderRequest = (
  provider: string,
  envelope: IntegrationMessageEnvelope,
  key: string,
  config: IntegrationConfig,
): ProviderRequest | null => {
  const adapter = resolveAdapter(provider);
  return adapter ? adapter(envelope, key, config) : null;
};
