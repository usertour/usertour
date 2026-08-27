// ---------------------------------------------------------------------------
// Outbound integrations (ADR 0011)
// ---------------------------------------------------------------------------

/** Analytics providers the outbound pipeline supports. The instantiated list
 *  (`INTEGRATION_PROVIDERS`) lives in `@usertour/constants`. */
export type IntegrationProvider = 'amplitude' | 'heap' | 'mixpanel' | 'posthog' | 'segment';

export type IntegrationRegion = 'US' | 'EU';

/** Provider extras stored in `Integration.config`. */
export type IntegrationConfig = {
  region?: IntegrationRegion;
};
