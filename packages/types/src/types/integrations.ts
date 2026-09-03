// ---------------------------------------------------------------------------
// Outbound integrations (ADR 0011)
// ---------------------------------------------------------------------------

/** Analytics providers the outbound pipeline supports. The instantiated list
 *  (`INTEGRATION_PROVIDERS`) lives in `@usertour/constants`. */
export type AnalyticsIntegrationProvider =
  | 'amplitude'
  | 'heap'
  | 'mixpanel'
  | 'posthog'
  | 'segment';

/** Automation platforms that connect from their own side — a Zap creates
 *  ordinary webhooks here — so they have a catalog entry but no server row. */
export type AutomationIntegrationProvider = 'zapier';

export type IntegrationProvider = AnalyticsIntegrationProvider | AutomationIntegrationProvider;

/** How a catalog entry is set up: configured here (API key) vs. from the
 *  provider's side (link-out). */
export type IntegrationKind = 'analytics' | 'automation';

export type IntegrationRegion = 'US' | 'EU';

/** Provider extras stored in `Integration.config`. */
export type IntegrationConfig = {
  region?: IntegrationRegion;
};
