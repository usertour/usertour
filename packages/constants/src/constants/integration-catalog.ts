import type { IntegrationKind, IntegrationProvider } from '@usertour/types';

/**
 * Display metadata for the supported integration providers (ADR 0011: the
 * five analytics destinations; ADR 0013: the CRM providers). Provider ids must stay in step with
 * INTEGRATION_PROVIDERS — the settings pages and the segment surfaces
 * (sidebar badges, condition pickers) all render from THIS array so ordering
 * and assets live in one place; names are proper nouns, not translated.
 * Image paths resolve against the web app's public assets.
 */
export interface IntegrationCatalogEntry {
  provider: IntegrationProvider;
  name: string;
  imagePath: string;
  /** API-key analytics destination vs OAuth CRM sync (ADR 0013). */
  kind: IntegrationKind;
  /** Whether the provider has an EU data-residency variant. */
  hasRegion: boolean;
  /** Whether the provider can push cohorts INTO Usertour (ADR 0012). */
  hasInbound: boolean;
}

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    provider: 'amplitude',
    kind: 'analytics',
    name: 'Amplitude',
    imagePath: '/images/integrations/amplitude.png',
    hasRegion: true,
    hasInbound: true,
  },
  {
    provider: 'heap',
    kind: 'analytics',
    name: 'Heap',
    imagePath: '/images/integrations/heap.png',
    hasRegion: false,
    hasInbound: false,
  },
  {
    provider: 'mixpanel',
    kind: 'analytics',
    name: 'Mixpanel',
    imagePath: '/images/integrations/mixpanel.png',
    hasRegion: true,
    hasInbound: true,
  },
  {
    provider: 'posthog',
    kind: 'analytics',
    name: 'PostHog',
    imagePath: '/images/integrations/posthog.png',
    hasRegion: true,
    hasInbound: false,
  },
  {
    provider: 'segment',
    kind: 'analytics',
    name: 'Segment',
    imagePath: '/images/integrations/segment.png',
    hasRegion: true,
    hasInbound: false,
  },
  {
    provider: 'hubspot',
    kind: 'crm',
    name: 'HubSpot',
    imagePath: '/images/integrations/hubspot.png',
    hasRegion: false,
    hasInbound: false,
  },
];

/** Catalog entry for a synced segment's `source` value, if it names a provider. */
export const catalogEntryForSource = (source: string | undefined | null) =>
  source ? INTEGRATION_CATALOG.find((entry) => entry.provider === source) : undefined;
