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
