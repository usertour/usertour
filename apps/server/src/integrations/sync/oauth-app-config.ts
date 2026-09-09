import type { ConfigService } from '@nestjs/config';
import { SYNC_INTEGRATION_PROVIDERS } from '@usertour/constants';
import type { IntegrationProvider } from '@usertour/types';

/**
 * Whether the provider's OAuth app credentials are present in the server
 * config (`<provider>.clientId` / `<provider>.clientSecret`). Cloud always
 * has them; a self-hosted instance only after the operator registers their
 * own app (ADR 0013 §2).
 */
export const isOAuthProviderConfigured = (
  configService: ConfigService,
  provider: IntegrationProvider,
): boolean =>
  !!configService.get<string>(`${provider}.clientId`) &&
  !!configService.get<string>(`${provider}.clientSecret`);

/** The sync providers this server can start an OAuth handshake for. */
export const configuredOAuthProviders = (configService: ConfigService): IntegrationProvider[] =>
  SYNC_INTEGRATION_PROVIDERS.filter((provider) =>
    isOAuthProviderConfigured(configService, provider),
  );
