import type { AnalyticsIntegrationProvider, CrmIntegrationProvider } from '@usertour/types';

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
