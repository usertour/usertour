export enum Integrations {
  GOOGLE_ANALYTICS = 'ga',
  AMPLITUDE = 'amplitude',
  HUBSPOT = 'hubspot',
  INTERCOM = 'intercom',
  KLAVIYO = 'klaviyo',
  LOGROCKET = 'logrocket',
  MIXPANEL = 'mixpanel',
  POSTHOG = 'posthog',
  SEGMENT = 'segment',
}

export type Integration = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  displayName: string; // Name of the integration (e.g., "Google Analytics")
  codeName: string; // Code of the integration (e.g., "ga", "mixpanel", "posthog")
  description?: string; // Optional description of the integration
  configSchema?: Record<string, any>; // JSON schema for configuration (optional)
  projectId: string; // Associated project ID
  enabled: boolean;
};

export type BizIntegration = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  integration: Integration;
  integrationId: string;
  config?: Record<string, any>;
  enabled: boolean;
};

export const integrationImages: Record<string, string> = {
  ga: '/images/integrations/ga.png', // Google Analytics
  amplitude: '/images/integrations/amplitude.png', // Amplitude
  hubspot: '/images/integrations/hubspot.png', // HubSpot
  intercom: '/images/integrations/intercom.png', // Intercom
  klaviyo: '/images/integrations/klaviyo.png', // Klaviyo
  logrocket: '/images/integrations/logrocket.png', // LogRocket
  mixpanel: '/images/integrations/mixpanel.png', // Mixpanel
  posthog: '/images/integrations/posthog.png', // PostHog
  segment: '/images/integrations/segment.png', // Segment
};
