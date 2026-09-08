import type { ConfigService } from '@nestjs/config';
import { CRM_INTEGRATION_PROVIDERS } from '@usertour/constants';
import type { CrmIntegrationProvider } from '@usertour/types';

/**
 * Whether the provider's OAuth app credentials are present in the server
 * config (`<provider>.clientId` / `<provider>.clientSecret`). Cloud always
 * has them; a self-hosted instance only after the operator registers their
 * own app (ADR 0013 §2).
 */
export const isCrmProviderConfigured = (
  configService: ConfigService,
  provider: CrmIntegrationProvider,
): boolean =>
  !!configService.get<string>(`${provider}.clientId`) &&
  !!configService.get<string>(`${provider}.clientSecret`);

/** The CRM providers this server can start an OAuth handshake for. */
export const configuredCrmProviders = (configService: ConfigService): CrmIntegrationProvider[] =>
  CRM_INTEGRATION_PROVIDERS.filter((provider) => isCrmProviderConfigured(configService, provider));
