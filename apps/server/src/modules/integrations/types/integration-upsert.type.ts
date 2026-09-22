/**
 * A provider integration to configure or reconfigure — what
 * IntegrationsService.upsert takes. `key` is absent on later writes to keep
 * the stored one (it is never echoed back).
 */
export type IntegrationUpsert = {
  environmentId: string;
  provider: string;
  key?: string;
  config?: { region?: 'US' | 'EU' };
  enabled?: boolean;
};
