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
/** Providers connected over OAuth and synced by the object-sync engine (ADR 0013 §4); a capability, not a kind. */
export type SyncIntegrationProvider = 'hubspot';

/** Automation platforms that connect from their own side — a Zap creates
 *  ordinary webhooks here — so they have a catalog entry but no server row. */
export type AutomationIntegrationProvider = 'zapier';

export type IntegrationProvider =
  | AnalyticsIntegrationProvider
  | CrmIntegrationProvider
  | AutomationIntegrationProvider;

/**
 * How a provider is wired: analytics destinations take a pasted API key and
 * stream every event (ADR 0011); CRM providers connect over OAuth and sync
 * mapped objects in both directions (ADR 0013); automation platforms are
 * set up from their own side (link-out).
 */
export type IntegrationKind = 'analytics' | 'crm' | 'automation';

export type IntegrationRegion = 'US' | 'EU';

/** Provider extras stored in `Integration.config`. */
export type IntegrationConfig = {
  region?: IntegrationRegion;
  /** Sync providers: milestone events written to the provider's record timeline (ADR 0013 §8). */
  events?: {
    enabled: boolean;
    /** Subset of SYNC_TIMELINE_EVENTS (codeNames). */
    codeNames: string[];
  };
};

// ---------------------------------------------------------------------------
// CRM sync (ADR 0013)
// ---------------------------------------------------------------------------

/** Provider object types the mapping layer understands (provider vocabulary). */
export type SyncRemoteObject = 'contact' | 'company';

/** Usertour object types a remote object can be paired with. */
export type SyncLocalObject = 'user' | 'company';

/** How remote records are paired with local ones. */
export type SyncMatchStrategy = 'email' | 'remoteField';

/** A provider-owned attribute: remote property → local attribute code name. */
export interface SyncInboundField {
  remote: string;
  local: string;
}

/** A Usertour-owned write-back: local attribute code name → remote property. */
export interface SyncOutboundField {
  local: string;
  remote: string;
}
