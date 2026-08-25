import type { IntegrationProvider } from '@usertour/types';

/**
 * The analytics providers the outbound integrations pipeline supports
 * (ADR 0011). The server validates `Integration.provider` against this list;
 * the web catalog renders from it. Order is the catalog display order.
 */
export const INTEGRATION_PROVIDERS: readonly IntegrationProvider[] = [
  'amplitude',
  'heap',
  'mixpanel',
  'posthog',
  'segment',
];

/**
 * Topic of dashboard-triggered integration test messages. Mirrors
 * WEBHOOK_TEST_TOPIC: addressed to one destination directly, single attempt.
 */
export const INTEGRATION_TEST_TOPIC = 'integration.test';
