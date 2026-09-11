import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import type { Integration, Prisma } from '@prisma/client';
import type { CookieOptions } from 'express';
import { SYNC_INTEGRATION_PROVIDERS } from '@usertour/constants';
import type { SyncIntegrationProvider, IntegrationProvider } from '@usertour/types';
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
  isHubspotReturnUrl,
  refreshHubspotToken,
  revokeHubspotRefreshToken,
  withHubspotState,
} from './hubspot-api';
import { isOAuthProviderConfigured } from './oauth-app-config';
import { hubspotErrorStatus } from './hubspot-crm-api';
import { fetchHubspotAppToken } from './hubspot-journal-api';

/** Decrypted shape of Integration.oauthCredentials. */
export interface ProviderOAuthCredentials {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

/** Claims carried by the signed OAuth `state` (ADR 0013 §2). */
interface ProviderOAuthTransaction {
  tokenType: 'integration-oauth-tx';
  provider: SyncIntegrationProvider;
  environmentId: string;
  projectId: string;
  /**
   * The user who started the handshake. Named `sub`, never `userId`: the
   * state is signed with the session secret and travels through the
   * provider, browser history and access logs, so it must not satisfy the
   * session strategy (which reads `userId`) — same rule as the 2FA challenge.
   */
  sub: string;
  /**
   * Set when the provider's marketplace started the install: its finalize
   * leg arrives inside the provider's frame, without our transaction cookie,
   * and is verified by spending the state instead (see consumeState).
   */
  marketplace?: true;
}

/** System-owned bookkeeping in Integration.remoteState (ADR 0013 §3). */
export interface ProviderRemoteState {
  account?: { domain?: string };
}

/** App-level (client credentials) tokens are reused until close to expiry. */
const APP_TOKEN_MARGIN_MS = 5 * 60 * 1000;

/** Refresh when the access token has less than this left (HubSpot tokens live 30 min). */
const REFRESH_MARGIN_MS = 2 * 60 * 1000;
/** Longer than the token request timeout, so a slow refresh cannot outlive its own lock. */
const REFRESH_LOCK_TTL_SECONDS = 30;
const STATE_TTL = '10m';
const STATE_TTL_SECONDS = 10 * 60;
/** Where the transaction cookie lives: the OAuth callback route, nothing else. */
export const INTEGRATION_TX_COOKIE_PATH = '/api/integrations/hubspot/oauth';
const INTEGRATION_TX_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;
const OAUTH_PROVIDER_KEY = ''; // OAuth rows never carry an API key; the column is NOT NULL.

/**
 * Thrown when the provider says the grant no longer exists (the customer
 * uninstalled the app or revoked access). Deliveries treat it as a failed
 * attempt so the breaker disables the integration and notifies.
 */
/** Outcome of a completed handshake: the row, and the account it replaced (null on first connect). */
export interface ProviderOAuthResult {
  integration: Integration;
  previousAccountId: string | null;
}

/** The provider account is already connected to another environment (ADR 0013 §3: one account, one environment). */
export class AccountInUseError extends Error {
  constructor(provider: string) {
    super(`This ${provider} account is already connected to another environment.`);
    this.name = 'AccountInUseError';
  }
}

export class GrantRevokedError extends Error {
  constructor(provider: string) {
    super(`${provider} authorization was revoked; reconnect the integration.`);
    this.name = 'GrantRevokedError';
  }
}

/**
 * Provider connection lifecycle (ADR 0013 §2-3): the OAuth handshake that creates
 * the integration row, on-demand access-token refresh under a single-flight
 * lock, and disconnect. Provider-specific wire calls live in hubspot-api.ts;
 * this service is the only writer of `oauthCredentials`.
 */
@Injectable()
export class ProviderConnectionService {
  private readonly logger = new Logger(ProviderConnectionService.name);
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
  isProviderConfigured(provider: SyncIntegrationProvider): boolean {
    return isOAuthProviderConfigured(this.configService, provider);
  }

  private appCredentials(provider: SyncIntegrationProvider): HubspotAppCredentials {
    if (provider !== 'hubspot') {
      throw new ValidationError(`Unknown sync provider "${provider}".`);
    }
    return {
      clientId: this.configService.get<string>('hubspot.clientId') || '',
      clientSecret: this.configService.get<string>('hubspot.clientSecret') || '',
      redirectUri: this.configService.get<string>('hubspot.callbackUrl') || '',
    };
  }

  private assertProvider(provider: string): asserts provider is SyncIntegrationProvider {
    if (!SYNC_INTEGRATION_PROVIDERS.includes(provider as IntegrationProvider)) {
      throw new ValidationError(
        `Unknown sync provider "${provider}" — expected one of ${SYNC_INTEGRATION_PROVIDERS.join(', ')}.`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // OAuth handshake
  // ---------------------------------------------------------------------------

  /**
   * Mint the provider authorize URL. The `state` is a signed, short-lived JWT
   * binding the callback to the environment (and the user who started it);
   * the caller sets it as the transaction cookie on its own authenticated
   * response, and the callback requires the cookie to match (see
   * HubspotOAuthController). The authorization code itself is single-use at
   * the provider, so no nonce store is needed for replay.
   *
   * A marketplace-initiated install (HubSpot's "Install app") passes the
   * `returnUrl` HubSpot gave the callback: the state then travels back to
   * HubSpot on that URL instead of to our authorize URL — HubSpot shows the
   * consent screen itself and returns to the callback with code and state.
   */
  async startOAuth(input: {
    environmentId: string;
    provider: string;
    userId: string;
    returnUrl?: string | null;
  }): Promise<{ url: string; state: string }> {
    const { environmentId, userId, returnUrl } = input;
    this.assertProvider(input.provider);
    const provider = input.provider;
    if (returnUrl && !isHubspotReturnUrl(returnUrl)) {
      throw new ValidationError('The install return URL is not a HubSpot address.');
    }
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
    const transaction: ProviderOAuthTransaction = {
      tokenType: 'integration-oauth-tx',
      provider,
      environmentId,
      projectId: environment.projectId,
      sub: userId,
      ...(returnUrl ? { marketplace: true as const } : {}),
    };
    const state = await this.jwtService.signAsync(transaction, { expiresIn: STATE_TTL });
    return {
      url: returnUrl ? withHubspotState(returnUrl, state) : this.authorizeUrl(transaction, state),
      state,
    };
  }

  /**
   * Options for the transaction cookie `startIntegrationOAuth` sets on its response
   * — the only proof the callback accepts. 'lax' (not 'strict') so the cookie
   * rides the provider's top-level GET back to the callback; scoped to the
   * callback path; as short-lived as the state it must match.
   */
  transactionCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: !!this.configService.get('auth.cookie.secure'),
      sameSite: 'lax',
      maxAge: INTEGRATION_TX_COOKIE_MAX_AGE_MS,
      path: INTEGRATION_TX_COOKIE_PATH,
    };
  }

  private authorizeUrl(transaction: ProviderOAuthTransaction, state: string): string {
    return buildHubspotAuthorizeUrl(this.appCredentials(transaction.provider), state);
  }

  /**
   * Spend a marketplace state: true the first time, false on any later call
   * within its lifetime. The provider drives that leg inside its own frame,
   * where our transaction cookie cannot travel (a cross-site request), so
   * the signed state is the whole proof — and a proof that can be presented
   * twice is not one: a captured callback URL must not connect a second time.
   * Redis being unavailable reads as "already spent": the install fails
   * closed and the user retries.
   */
  async consumeState(state: string): Promise<boolean> {
    const digest = createHash('sha256').update(state).digest('hex');
    const release = await this.redis.acquireLock(
      `integration:oauth:tx:${digest}`,
      STATE_TTL_SECONDS,
    );
    return release !== null;
  }

  /** Verify the signed state; throws OAuthError on anything but a fresh, valid one. */
  async verifyState(state: string): Promise<ProviderOAuthTransaction> {
    try {
      const claims = await this.jwtService.verifyAsync<ProviderOAuthTransaction>(state);
      if (claims.tokenType !== 'integration-oauth-tx') {
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
   * replaces the grant and resets the breaker. The same account keeps its
   * system state (subscription ids, created properties); a different account
   * starts from a clean state, and the caller is told the previous account so
   * it can drop the links that pointed into it (record ids no longer line up).
   */
  async completeOAuth(
    transaction: ProviderOAuthTransaction,
    code: string,
  ): Promise<ProviderOAuthResult> {
    const { provider, environmentId } = transaction;
    await this.assertEntitled(environmentId);
    const app = this.appCredentials(provider);
    const tokens = await exchangeHubspotCode(app, code);
    const info = await fetchHubspotTokenInfo(app, tokens.access_token);
    const credentials = this.toCredentials(tokens);
    const encrypted = this.encryption.encrypt(JSON.stringify(credentials));
    const remoteAccountId = String(info.hub_id);
    // One provider account per environment, anywhere: change subscriptions
    // are per account, so two environments on one account would overwrite
    // each other's. A disconnected row keeps its account id for bookkeeping
    // and does not hold the account.
    const holder = await this.prisma.integration.findFirst({
      where: {
        provider,
        remoteAccountId,
        oauthCredentials: { not: null },
        NOT: { environmentId },
      },
      select: { id: true },
    });
    if (holder) {
      throw new AccountInUseError(provider);
    }
    const existing = await this.prisma.integration.findUnique({
      where: { environmentId_provider: { environmentId, provider } },
      select: { remoteAccountId: true, remoteState: true },
    });
    const previousAccountId = existing?.remoteAccountId ?? null;
    const sameAccount = previousAccountId === remoteAccountId;
    const remoteState: ProviderRemoteState = {
      ...(sameAccount ? ((existing?.remoteState ?? {}) as ProviderRemoteState) : {}),
      account: { domain: info.hub_domain },
    };

    const integration = await this.prisma.integration.upsert({
      where: { environmentId_provider: { environmentId, provider } },
      create: {
        environmentId,
        provider,
        key: OAUTH_PROVIDER_KEY,
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
    return { integration, previousAccountId };
  }

  /**
   * Drop the grant. The row survives (mappings and the message log stay
   * readable); syncing stops because there is no credential to sync with.
   * The account id stays: a later connect compares it to the new account to
   * decide whether the links still point at the right records.
   */
  async disconnect(integrationId: string): Promise<Integration> {
    const row = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!row) {
      throw new ValidationError('Integration not found.');
    }
    this.assertProvider(row.provider);
    await this.revokeGrant(row);
    return await this.prisma.integration.update({
      where: { id: integrationId },
      data: { enabled: false, oauthCredentials: null },
    });
  }

  /** Tell the provider to forget the grant; best-effort, the row is the caller's business. */
  async revokeGrant(row: Integration): Promise<void> {
    const credentials = this.readCredentials(row);
    if (!credentials) {
      return;
    }
    this.assertProvider(row.provider);
    try {
      await revokeHubspotRefreshToken(this.appCredentials(row.provider), credentials.refreshToken);
    } catch (error) {
      this.logger.warn(
        `Revoking ${row.provider} refresh token for integration ${row.id} failed: ${
          (error as Error).message
        }`,
      );
    }
  }

  /**
   * The provider stopped honouring the grant (app uninstalled, authorizing
   * user removed, token revoked). That is definitive — no retry ladder will
   * change it — so the integration is switched off at once: every sync path
   * gates on `enabled`, the page shows the disabled banner, and Reconnect is
   * the way back. Notification is the breaker's job and stays with it.
   */
  async markGrantRevoked(integrationId: string): Promise<void> {
    const { count } = await this.prisma.integration.updateMany({
      where: { id: integrationId, enabled: true },
      data: { enabled: false, autoDisabledAt: new Date(), cooldownUntil: null },
    });
    if (count > 0) {
      this.logger.warn(`Integration ${integrationId} disabled: the provider revoked the grant`);
    }
  }

  // ---------------------------------------------------------------------------
  // Access tokens
  // ---------------------------------------------------------------------------

  /**
   * The app's own token (client credentials) for app-level APIs such as the
   * change journal — not tied to any installed account. Cached per process.
   */
  async getAppAccessToken(provider: SyncIntegrationProvider): Promise<string> {
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
  async getAccessToken(
    integrationId: string,
    options: { rejected?: string } = {},
  ): Promise<string> {
    // A token the provider just rejected is stale whatever its expiry says;
    // one another worker has already replaced it is not.
    const stale = (candidate: ProviderOAuthCredentials) =>
      this.needsRefresh(candidate) || candidate.accessToken === options.rejected;
    const row = await this.loadConnected(integrationId);
    const credentials = this.readCredentials(row);
    if (!credentials) {
      throw new GrantRevokedError(row.provider);
    }
    if (!stale(credentials)) {
      return credentials.accessToken;
    }
    const release = await this.redis.acquireLock(
      `sync:refresh:${integrationId}`,
      REFRESH_LOCK_TTL_SECONDS,
    );
    if (!release) {
      return await this.awaitRefreshedToken(integrationId, credentials);
    }
    try {
      // Re-read under the lock: the previous holder may have refreshed
      // already — or a disconnect may have cleared the grant, in which case
      // there is nothing to refresh with.
      const current = await this.loadConnected(integrationId);
      const fresh = this.readCredentials(current);
      if (!fresh) {
        throw new GrantRevokedError(row.provider);
      }
      if (!stale(fresh)) {
        return fresh.accessToken;
      }
      return await this.refresh(current, fresh);
    } finally {
      await release();
    }
  }

  /**
   * Run a provider data call with a valid access token. The provider answers
   * 401 to a token it no longer honours — the grant was revoked out from
   * under us (app uninstalled, authorization revoked elsewhere), which does
   * not wait for the token's expiry. So a 401 refreshes once and retries:
   * a refused refresh is already GrantRevokedError, and a second 401 on a
   * fresh token is treated the same. Callers keep their existing handling
   * of that error (immediate auto-disable, round abandoned).
   */
  async withAccessToken<T>(
    integrationId: string,
    call: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    const token = await this.getAccessToken(integrationId);
    try {
      return await call(token);
    } catch (error) {
      if (hubspotErrorStatus(error) !== 401) {
        throw error;
      }
      // Worth a trace even when the retry succeeds: a token rejected before
      // its expiry says something happened to the grant on the provider side.
      this.logger.warn(
        `Provider rejected the access token of integration ${integrationId} before its expiry; refreshing once`,
      );
    }
    const renewed = await this.getAccessToken(integrationId, { rejected: token });
    if (renewed === token) {
      // Another worker holds the refresh lock and has not finished: not a
      // verdict on the grant. Let the caller retry later.
      throw new Error('Provider rejected the access token; a refresh is in progress elsewhere');
    }
    try {
      return await call(renewed);
    } catch (error) {
      if (hubspotErrorStatus(error) === 401) {
        const row = await this.loadConnected(integrationId);
        this.logger.warn(
          `${row.provider} rejects a freshly refreshed token for integration ${integrationId}: treating the grant as revoked`,
        );
        throw new GrantRevokedError(row.provider);
      }
      throw error;
    }
  }

  private async refresh(row: Integration, credentials: ProviderOAuthCredentials): Promise<string> {
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
        throw new GrantRevokedError(row.provider);
      }
      // Not a revoked grant as far as we can tell: say what the provider
      // answered (status and body carry no secrets), so a new shape is
      // recognisable from the log rather than a mystery.
      this.logger.warn(
        `${row.provider} token refresh failed for integration ${row.id}: status ${
          hubspotErrorStatus(error) ?? 'n/a'
        } body ${JSON.stringify(axios.isAxiosError(error) ? error.response?.data : undefined)}`,
      );
      throw error;
    }
    const next = this.toCredentials(tokens);
    // Compare-and-set on the ciphertext we refreshed from: a disconnect or a
    // reconnect that landed meanwhile must not be overwritten by a token of
    // the grant it replaced. The caller retries and reads whatever is current.
    const written = await this.prisma.integration.updateMany({
      where: { id: row.id, oauthCredentials: row.oauthCredentials },
      data: { oauthCredentials: this.encryption.encrypt(JSON.stringify(next)) },
    });
    if (written.count === 0) {
      throw new Error(
        `${row.provider} credentials changed during refresh; retry with the current grant`,
      );
    }
    return next.accessToken;
  }

  /**
   * Write one key of `remoteState` without disturbing the others, and only
   * while the row still belongs to the account the caller read it for: the
   * property cache and the journal subscription ids are per portal, and a
   * reconnect to another account must not inherit them from an in-flight job.
   * `merge` folds an object into the key; `replace` sets it.
   */
  async patchRemoteState(
    integrationId: string,
    remoteAccountId: string | null,
    key: string,
    value: Record<string, unknown>,
    mode: 'merge' | 'replace',
  ): Promise<void> {
    const json = JSON.stringify(value);
    if (mode === 'merge') {
      await this.prisma.$executeRaw`
        UPDATE "Integration"
        SET "remoteState" = jsonb_set(
              COALESCE("remoteState", '{}'::jsonb),
              ARRAY[${key}]::text[],
              COALESCE("remoteState" -> ${key}, '{}'::jsonb) || ${json}::jsonb
            ),
            "updatedAt" = NOW()
        WHERE "id" = ${integrationId} AND "remoteAccountId" = ${remoteAccountId}`;
      return;
    }
    await this.prisma.$executeRaw`
      UPDATE "Integration"
      SET "remoteState" = jsonb_set(COALESCE("remoteState", '{}'::jsonb), ARRAY[${key}]::text[], ${json}::jsonb),
          "updatedAt" = NOW()
      WHERE "id" = ${integrationId} AND "remoteAccountId" = ${remoteAccountId}`;
  }

  /** Poll briefly for the lock holder's refreshed credentials; fall back to using what we have. */
  private async awaitRefreshedToken(
    integrationId: string,
    stale: ProviderOAuthCredentials,
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

  private needsRefresh(credentials: ProviderOAuthCredentials): boolean {
    return credentials.expiresAt - Date.now() < REFRESH_MARGIN_MS;
  }

  private toCredentials(tokens: HubspotTokenResponse): ProviderOAuthCredentials {
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
  }

  /** Decrypt the stored grant; null when the row is disconnected. */
  readCredentials(row: Pick<Integration, 'oauthCredentials'>): ProviderOAuthCredentials | null {
    if (!row.oauthCredentials) {
      return null;
    }
    return JSON.parse(this.encryption.decrypt(row.oauthCredentials)) as ProviderOAuthCredentials;
  }
}
