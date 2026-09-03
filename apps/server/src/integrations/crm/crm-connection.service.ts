import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import type { Integration, Prisma } from '@prisma/client';
import { CRM_INTEGRATION_PROVIDERS } from '@usertour/constants';
import type { CrmIntegrationProvider } from '@usertour/types';
import { FeatureRequiresLicenseError, OAuthError, ValidationError } from '@/common/errors/errors';
import { ProjectsService } from '@/projects/projects.service';
import { EncryptionService } from '@/shared/encryption.service';
import { RedisService } from '@/shared/redis.service';
import {
  buildHubspotAuthorizeUrl,
  exchangeHubspotCode,
  fetchHubspotTokenInfo,
  HubspotAppCredentials,
  HubspotTokenResponse,
  isHubspotGrantRevoked,
  refreshHubspotToken,
  revokeHubspotRefreshToken,
} from './hubspot-api';
import { isCrmProviderConfigured } from './crm-app-config';
import { fetchHubspotAppToken } from './hubspot-journal-api';

/** Decrypted shape of Integration.oauthCredentials. */
export interface CrmOAuthCredentials {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

/** Claims carried by the signed OAuth `state` (ADR 0013 §2). */
interface CrmOAuthTransaction {
  tokenType: 'crm-oauth-tx';
  provider: CrmIntegrationProvider;
  environmentId: string;
  projectId: string;
  userId: string;
}

/** System-owned bookkeeping in Integration.remoteState (ADR 0013 §3). */
export interface CrmRemoteState {
  account?: { domain?: string };
}

/** App-level (client credentials) tokens are reused until close to expiry. */
const APP_TOKEN_MARGIN_MS = 5 * 60 * 1000;

/** Refresh when the access token has less than this left (HubSpot tokens live 30 min). */
const REFRESH_MARGIN_MS = 2 * 60 * 1000;
const STATE_TTL = '10m';
const CRM_PROVIDER_KEY = ''; // OAuth rows never carry an API key; the column is NOT NULL.

/**
 * Thrown when the provider says the grant no longer exists (the customer
 * uninstalled the app or revoked access). Deliveries treat it as a failed
 * attempt so the breaker disables the integration and notifies.
 */
export class CrmGrantRevokedError extends Error {
  constructor(provider: string) {
    super(`${provider} authorization was revoked; reconnect the integration.`);
    this.name = 'CrmGrantRevokedError';
  }
}

/**
 * CRM connection lifecycle (ADR 0013 §2-3): the OAuth handshake that creates
 * the integration row, on-demand access-token refresh under a single-flight
 * lock, and disconnect. Provider-specific wire calls live in hubspot-api.ts;
 * this service is the only writer of `oauthCredentials`.
 */
@Injectable()
export class CrmConnectionService {
  private readonly logger = new Logger(CrmConnectionService.name);
  private appToken: { accessToken: string; expiresAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly encryption: EncryptionService,
    private readonly redis: RedisService,
    private readonly projectsService: ProjectsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Plan gate (ADR 0013 §10): cloud Growth+, self-hosted forced on.
  // ---------------------------------------------------------------------------

  async isEntitled(environmentId: string): Promise<boolean> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { projectId: true },
    });
    if (!environment) {
      return false;
    }
    const config = await this.projectsService.getProjectConfig(environment.projectId);
    return config.crmIntegrations;
  }

  async assertEntitled(environmentId: string): Promise<void> {
    if (!(await this.isEntitled(environmentId))) {
      throw new FeatureRequiresLicenseError();
    }
  }

  /** Whether this deployment has provider app credentials configured at all. */
  isProviderConfigured(provider: CrmIntegrationProvider): boolean {
    return isCrmProviderConfigured(this.configService, provider);
  }

  private appCredentials(provider: CrmIntegrationProvider): HubspotAppCredentials {
    if (provider !== 'hubspot') {
      throw new ValidationError(`Unknown CRM provider "${provider}".`);
    }
    return {
      clientId: this.configService.get<string>('hubspot.clientId') || '',
      clientSecret: this.configService.get<string>('hubspot.clientSecret') || '',
      redirectUri: this.configService.get<string>('hubspot.callbackUrl') || '',
    };
  }

  private assertProvider(provider: string): asserts provider is CrmIntegrationProvider {
    if (!CRM_INTEGRATION_PROVIDERS.includes(provider as CrmIntegrationProvider)) {
      throw new ValidationError(
        `Unknown CRM provider "${provider}" — expected one of ${CRM_INTEGRATION_PROVIDERS.join(', ')}.`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // OAuth handshake
  // ---------------------------------------------------------------------------

  /**
   * Mint the provider authorize URL. The `state` is a signed, short-lived JWT
   * binding the callback to the environment (and the user who started it);
   * the authorization code itself is single-use at the provider, so no nonce
   * store is needed for replay protection.
   */
  async startOAuth(input: {
    environmentId: string;
    provider: string;
    userId: string;
  }): Promise<{ url: string }> {
    const { environmentId, userId } = input;
    this.assertProvider(input.provider);
    const provider = input.provider;
    await this.assertEntitled(environmentId);
    if (!this.isProviderConfigured(provider)) {
      throw new ValidationError(
        `${provider} is not configured on this server (missing app client id/secret).`,
      );
    }
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { projectId: true },
    });
    if (!environment) {
      throw new ValidationError('Environment not found.');
    }
    const transaction: CrmOAuthTransaction = {
      tokenType: 'crm-oauth-tx',
      provider,
      environmentId,
      projectId: environment.projectId,
      userId,
    };
    const state = await this.jwtService.signAsync(transaction, { expiresIn: STATE_TTL });
    return { url: buildHubspotAuthorizeUrl(this.appCredentials(provider), state) };
  }

  /** Verify the signed state; throws OAuthError on anything but a fresh, valid one. */
  async verifyState(state: string): Promise<CrmOAuthTransaction> {
    try {
      const claims = await this.jwtService.verifyAsync<CrmOAuthTransaction>(state);
      if (claims.tokenType !== 'crm-oauth-tx') {
        throw new OAuthError();
      }
      return claims;
    } catch {
      throw new OAuthError();
    }
  }

  /**
   * Finish the handshake: exchange the code, learn which account authorized,
   * and create (or re-arm) the integration row. Re-connecting an existing row
   * replaces the grant and resets the breaker; a different account than
   * before is allowed — links and mappings are re-resolved by the next full
   * sync, since remote ids no longer line up.
   */
  async completeOAuth(transaction: CrmOAuthTransaction, code: string): Promise<Integration> {
    const { provider, environmentId } = transaction;
    await this.assertEntitled(environmentId);
    const app = this.appCredentials(provider);
    const tokens = await exchangeHubspotCode(app, code);
    const info = await fetchHubspotTokenInfo(tokens.access_token);
    const credentials = this.toCredentials(tokens);
    const encrypted = this.encryption.encrypt(JSON.stringify(credentials));
    const remoteAccountId = String(info.hub_id);
    const remoteState: CrmRemoteState = { account: { domain: info.hub_domain } };

    return await this.prisma.integration.upsert({
      where: { environmentId_provider: { environmentId, provider } },
      create: {
        environmentId,
        provider,
        key: CRM_PROVIDER_KEY,
        keyTail: '',
        enabled: true,
        oauthCredentials: encrypted,
        remoteAccountId,
        remoteState: remoteState as Prisma.InputJsonObject,
      },
      update: {
        enabled: true,
        oauthCredentials: encrypted,
        remoteAccountId,
        remoteState: remoteState as Prisma.InputJsonObject,
        consecutiveFailures: 0,
        cooldownUntil: null,
        failingSince: null,
        autoDisabledAt: null,
      },
    });
  }

  /**
   * Drop the grant. The row survives (mappings and the message log stay
   * readable); syncing stops because there is no credential to sync with.
   */
  async disconnect(integrationId: string): Promise<Integration> {
    const row = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!row) {
      throw new ValidationError('Integration not found.');
    }
    this.assertProvider(row.provider);
    const credentials = this.readCredentials(row);
    if (credentials) {
      try {
        await revokeHubspotRefreshToken(credentials.refreshToken);
      } catch (error) {
        this.logger.warn(
          `Revoking ${row.provider} refresh token for integration ${row.id} failed: ${
            (error as Error).message
          }`,
        );
      }
    }
    return await this.prisma.integration.update({
      where: { id: integrationId },
      data: { enabled: false, oauthCredentials: null, remoteAccountId: null },
    });
  }

  // ---------------------------------------------------------------------------
  // Access tokens
  // ---------------------------------------------------------------------------

  /**
   * The app's own token (client credentials) for app-level APIs such as the
   * change journal — not tied to any installed account. Cached per process.
   */
  async getAppAccessToken(provider: CrmIntegrationProvider): Promise<string> {
    if (this.appToken && this.appToken.expiresAt - Date.now() > APP_TOKEN_MARGIN_MS) {
      return this.appToken.accessToken;
    }
    const app = this.appCredentials(provider);
    if (!app.clientId || !app.clientSecret) {
      throw new ValidationError(`${provider} is not configured on this server.`);
    }
    const token = await fetchHubspotAppToken(app);
    this.appToken = {
      accessToken: token.accessToken,
      expiresAt: Date.now() + token.expiresIn * 1000,
    };
    return token.accessToken;
  }

  /**
   * A valid access token for the integration, refreshing under a per-row
   * single-flight lock when the stored one is within the expiry margin. A
   * worker that loses the lock waits for the winner's write instead of
   * racing a second refresh (HubSpot rotates refresh tokens on use).
   */
  async getAccessToken(integrationId: string): Promise<string> {
    const row = await this.loadConnected(integrationId);
    const credentials = this.readCredentials(row);
    if (!credentials) {
      throw new CrmGrantRevokedError(row.provider);
    }
    if (!this.needsRefresh(credentials)) {
      return credentials.accessToken;
    }
    const release = await this.redis.acquireLock(`crm:refresh:${integrationId}`);
    if (!release) {
      return await this.awaitRefreshedToken(integrationId, credentials);
    }
    try {
      // Re-read under the lock: the previous holder may have refreshed already.
      const fresh = this.readCredentials(await this.loadConnected(integrationId));
      if (fresh && !this.needsRefresh(fresh)) {
        return fresh.accessToken;
      }
      return await this.refresh(row, fresh ?? credentials);
    } finally {
      await release();
    }
  }

  private async refresh(row: Integration, credentials: CrmOAuthCredentials): Promise<string> {
    this.assertProvider(row.provider);
    let tokens: HubspotTokenResponse;
    try {
      tokens = await refreshHubspotToken(
        this.appCredentials(row.provider),
        credentials.refreshToken,
      );
    } catch (error) {
      if (isHubspotGrantRevoked(error)) {
        this.logger.warn(`${row.provider} grant revoked for integration ${row.id}`);
        throw new CrmGrantRevokedError(row.provider);
      }
      throw error;
    }
    const next = this.toCredentials(tokens);
    await this.prisma.integration.update({
      where: { id: row.id },
      data: { oauthCredentials: this.encryption.encrypt(JSON.stringify(next)) },
    });
    return next.accessToken;
  }

  /** Poll briefly for the lock holder's refreshed credentials; fall back to using what we have. */
  private async awaitRefreshedToken(
    integrationId: string,
    stale: CrmOAuthCredentials,
  ): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const fresh = this.readCredentials(await this.loadConnected(integrationId));
      if (fresh && fresh.accessToken !== stale.accessToken) {
        return fresh.accessToken;
      }
    }
    // The winner is slow or died; the stale token may still have seconds left.
    return stale.accessToken;
  }

  private async loadConnected(integrationId: string): Promise<Integration> {
    const row = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!row) {
      throw new ValidationError('Integration not found.');
    }
    return row;
  }

  private needsRefresh(credentials: CrmOAuthCredentials): boolean {
    return credentials.expiresAt - Date.now() < REFRESH_MARGIN_MS;
  }

  private toCredentials(tokens: HubspotTokenResponse): CrmOAuthCredentials {
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
  }

  /** Decrypt the stored grant; null when the row is disconnected. */
  readCredentials(row: Pick<Integration, 'oauthCredentials'>): CrmOAuthCredentials | null {
    if (!row.oauthCredentials) {
      return null;
    }
    return JSON.parse(this.encryption.decrypt(row.oauthCredentials)) as CrmOAuthCredentials;
  }
}
