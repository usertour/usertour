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

/** CRM providers synced through the object-mapping layer (ADR 0013). */
export type CrmIntegrationProvider = 'hubspot';

export type IntegrationProvider = AnalyticsIntegrationProvider | CrmIntegrationProvider;

/**
 * How a provider is wired: analytics destinations take a pasted API key and
 * stream every event (ADR 0011); CRM providers connect over OAuth and sync
 * mapped objects in both directions (ADR 0013).
 */
export type IntegrationKind = 'analytics' | 'crm';

export type IntegrationRegion = 'US' | 'EU';

/** Provider extras stored in `Integration.config`. */
export type IntegrationConfig = {
  region?: IntegrationRegion;
};

// ---------------------------------------------------------------------------
// CRM sync (ADR 0013)
// ---------------------------------------------------------------------------

/** Provider object types the mapping layer understands (provider vocabulary). */
export type CrmRemoteObject = 'contact' | 'company';

/** Usertour object types a remote object can be paired with. */
export type CrmLocalObject = 'user' | 'company';

/** How remote records are paired with local ones. */
export type CrmMatchStrategy = 'email' | 'remoteField';

/** A provider-owned attribute: remote property → local attribute code name. */
export interface CrmInboundField {
  remote: string;
  local: string;
}

/** A Usertour-owned write-back: local attribute code name → remote property. */
export interface CrmOutboundField {
  local: string;
  remote: string;
}
