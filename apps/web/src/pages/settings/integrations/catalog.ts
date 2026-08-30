import type { IntegrationProvider } from '@usertour/types';

/**
 * Display metadata for the supported providers (ADR 0011: the five analytics
 * destinations). Provider ids must stay in step with INTEGRATION_PROVIDERS in
 * @usertour/constants — the list page renders THIS array so ordering and
 * assets live in one place; names are proper nouns, not translated.
 */
export interface IntegrationCatalogEntry {
  provider: IntegrationProvider;
  name: string;
  imagePath: string;
  /** Whether the provider has an EU data-residency variant. */
  hasRegion: boolean;
  /** Whether the provider can push cohorts INTO Usertour (ADR 0012). */
  hasInbound: boolean;
}

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    provider: 'amplitude',
    name: 'Amplitude',
    imagePath: '/images/integrations/amplitude.png',
    hasRegion: true,
    hasInbound: false,
  },
  {
    provider: 'heap',
    name: 'Heap',
    imagePath: '/images/integrations/heap.png',
    hasRegion: false,
    hasInbound: false,
  },
  {
    provider: 'mixpanel',
    name: 'Mixpanel',
    imagePath: '/images/integrations/mixpanel.png',
    hasRegion: true,
    hasInbound: true,
  },
  {
    provider: 'posthog',
    name: 'PostHog',
    imagePath: '/images/integrations/posthog.png',
    hasRegion: true,
    hasInbound: false,
  },
  {
    provider: 'segment',
    name: 'Segment',
    imagePath: '/images/integrations/segment.png',
    hasRegion: true,
    hasInbound: false,
  },
];

/** Catalog entry for a synced segment's `source` value, if it names a provider. */
export const catalogEntryForSource = (source: string | undefined | null) =>
  source ? INTEGRATION_CATALOG.find((entry) => entry.provider === source) : undefined;
