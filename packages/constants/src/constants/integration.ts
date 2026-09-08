import {
  type AnalyticsIntegrationProvider,
  AttributeDataType,
  type CrmIntegrationProvider,
  type CrmLocalObject,
} from '@usertour/types';

/**
 * The analytics providers the outbound integrations pipeline supports
 * (ADR 0011). The server validates `Integration.provider` against this list;
 * the web catalog renders from it. Order is the catalog display order.
 */
export const INTEGRATION_PROVIDERS: readonly AnalyticsIntegrationProvider[] = [
  'amplitude',
  'heap',
  'mixpanel',
  'posthog',
  'segment',
];

/**
 * CRM providers (ADR 0013). They never take an API key: the row is created by
 * the OAuth callback, so the key-based upsert path rejects them.
 */
export const CRM_INTEGRATION_PROVIDERS: readonly CrmIntegrationProvider[] = ['hubspot'];

/**
 * Topic of dashboard-triggered integration test messages. Mirrors
 * WEBHOOK_TEST_TOPIC: addressed to one destination directly, single attempt.
 */
export const INTEGRATION_TEST_TOPIC = 'integration.test';

/** The provider-side property group every Usertour write-back property lives in (ADR 0013 §6). */
export const CRM_REMOTE_PROPERTY_GROUP = { name: 'usertour', label: 'Usertour' } as const;

/** Provider property name for a Usertour-owned attribute (provider names are lowercase). */
export const crmRemotePropertyNameFor = (local: CrmLocalObject, codeName: string): string =>
  `usertour_${local}_${codeName.toLowerCase()}`;

/** Provider property type → Usertour attribute data type (ADR 0013 §6). */
export const crmLocalDataTypeFor = (property: {
  type: string;
  fieldType: string;
}): AttributeDataType => {
  switch (property.type) {
    case 'number':
      return AttributeDataType.Number;
    case 'bool':
      return AttributeDataType.Boolean;
    case 'date':
    case 'datetime':
      return AttributeDataType.DateTime;
    case 'enumeration':
      return property.fieldType === 'checkbox' ? AttributeDataType.List : AttributeDataType.String;
    default:
      return AttributeDataType.String;
  }
};

/**
 * A full-sync round whose heartbeat is older than this is presumed dead (its
 * job was lost with the queue): the server takes it over on its next scan and
 * the dashboard stops showing it as running (ADR 0013 §7). The heartbeat is
 * refreshed by every page and every retry, so the window only has to outlast
 * the longest single wait a page job can take — the delivery ladder's top
 * rung and the Retry-After cap are both 12h (apps/server delivery-backoff;
 * a unit test pins the relation).
 */
export const CRM_ROUND_STALE_MS = 13 * 60 * 60 * 1000;
