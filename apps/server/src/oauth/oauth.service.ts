import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import OAuth2Server from '@node-oauth/oauth2-server';
import { cuid } from '@usertour/helpers';
import { PrismaService } from 'nestjs-prisma';

import { OAuthModelService } from './oauth-model.service';
import { accessTokenSecret, generateOpaqueSecret, hashSecret } from './oauth.crypto';
import { isAllowedRedirectUri } from './redirect-allowlist';

const ACCESS_TOKEN_LIFETIME = 60 * 60; // 1h
const REFRESH_TOKEN_LIFETIME = 30 * 24 * 60 * 60; // 30d
const AUTH_CODE_LIFETIME = 10 * 60; // 10m
const TRANSACTION_LIFETIME = '10m';

/** The validated authorize request, carried (signed) to the consent page. */
export interface TransactionClaims {
  kind: 'oauth_authorize';
  clientId: string;
  redirectUri: string;
  scope: string[];
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  resource?: string;
}

interface RegisterBody {
  client_name?: string;
  redirect_uris?: unknown;
  grant_types?: unknown;
  token_endpoint_auth_method?: string;
  logo_uri?: string;
  client_uri?: string;
}

@Injectable()
export class OAuthService {
  private readonly server: OAuth2Server;

  constructor(
    private readonly model: OAuthModelService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {
    this.server = new OAuth2Server({
      model: this.model,
      // Public clients (PKCE, no secret) may refresh without a secret.
      requireClientAuthentication: { refresh_token: false },
      // Rotate the refresh token on every refresh (RFC 9700 / 6819 §5.2.2.3).
      alwaysIssueNewRefreshToken: true,
    });
  }

  // ── Consent transaction (stateless, signed) ─────────────────────────────────
  signTransaction(claims: TransactionClaims): string {
    return this.jwt.sign(claims, { expiresIn: TRANSACTION_LIFETIME });
  }

  verifyTransaction(token: string): TransactionClaims {
    let claims: TransactionClaims;
    try {
      claims = this.jwt.verify<TransactionClaims>(token);
    } catch {
      throw new BadRequestException('Invalid or expired authorization transaction');
    }
    if (claims.kind !== 'oauth_authorize') {
      throw new BadRequestException('Invalid authorization transaction');
    }
    return claims;
  }

  // ── Authorize (validate the inbound request, before consent) ─────────────────
  async validateAuthorizeRequest(query: Record<string, unknown>): Promise<TransactionClaims> {
    const clientId = String(query.client_id ?? '');
    const redirectUri = String(query.redirect_uri ?? '');
    const responseType = String(query.response_type ?? '');
    const codeChallenge = query.code_challenge ? String(query.code_challenge) : undefined;
    const codeChallengeMethod = query.code_challenge_method
      ? String(query.code_challenge_method)
      : undefined;

    if (responseType !== 'code') {
      throw new BadRequestException('Only response_type=code is supported');
    }
    const client = await this.prisma.oAuthClient.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new BadRequestException('Unknown client_id');
    }
    const redirectUris = Array.isArray(client.redirectUris)
      ? (client.redirectUris as string[])
      : [];
    if (!redirectUris.includes(redirectUri)) {
      throw new BadRequestException('redirect_uri does not match a registered URI');
    }
    // PKCE is required (public clients) — S256 only.
    if (!codeChallenge || codeChallengeMethod !== 'S256') {
      throw new BadRequestException('PKCE with code_challenge_method=S256 is required');
    }

    const scope = String(query.scope ?? '')
      .split(/\s+/)
      .filter(Boolean);

    return {
      kind: 'oauth_authorize',
      clientId,
      redirectUri,
      scope,
      state: query.state ? String(query.state) : undefined,
      codeChallenge,
      codeChallengeMethod,
      resource: query.resource ? String(query.resource) : undefined,
    };
  }

  /** Display info for the consent screen (client identity). */
  async getClientDisplay(clientId: string) {
    const client = await this.prisma.oAuthClient.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new BadRequestException('Unknown client_id');
    }
    return {
      id: client.id,
      name: client.name,
      logoUri: client.logoUri,
      clientUri: client.clientUri,
    };
  }

  /**
   * Issue an authorization code for an approved consent and return the redirect
   * URL (the client callback with `?code=&state=`). Runs @node-oauth's authorize
   * with the chosen project + scopes bound to the user.
   */
  async issueAuthorizationCode(
    claims: TransactionClaims,
    userId: string,
    projectId: string,
    scopes: string[],
    allowedEnvironmentIds?: string[] | null,
  ): Promise<string> {
    const grantId = cuid();
    const request = new OAuth2Server.Request({
      method: 'GET',
      headers: {},
      query: {
        response_type: 'code',
        client_id: claims.clientId,
        redirect_uri: claims.redirectUri,
        scope: scopes.join(' '),
        ...(claims.state ? { state: claims.state } : {}),
        ...(claims.codeChallenge ? { code_challenge: claims.codeChallenge } : {}),
        ...(claims.codeChallengeMethod
          ? { code_challenge_method: claims.codeChallengeMethod }
          : {}),
      },
    });
    const response = new OAuth2Server.Response();
    await this.server.authorize(request, response, {
      allowEmptyState: true,
      authorizationCodeLifetime: AUTH_CODE_LIFETIME,
      authenticateHandler: {
        handle: () => ({ id: userId, projectId, grantId, allowedEnvironmentIds }),
      },
    });
    const location = response.headers?.location;
    if (!location) {
      throw new BadRequestException('Failed to issue authorization code');
    }
    return location;
  }

  // ── Token endpoint ──────────────────────────────────────────────────────────
  async token(req: {
    headers: Record<string, string>;
    method: string;
    query: Record<string, string>;
    body: unknown;
  }) {
    await this.requireConfidentialClientSecret(req.body);
    const request = new OAuth2Server.Request(req);
    const response = new OAuth2Server.Response();
    const token = await this.server.token(request, response, {
      accessTokenLifetime: ACCESS_TOKEN_LIFETIME,
      refreshTokenLifetime: REFRESH_TOKEN_LIFETIME,
    });
    return {
      access_token: token.accessToken,
      token_type: 'Bearer',
      expires_in: token.accessTokenExpiresAt
        ? Math.max(0, Math.round((token.accessTokenExpiresAt.getTime() - Date.now()) / 1000))
        : ACCESS_TOKEN_LIFETIME,
      refresh_token: token.refreshToken,
      scope: token.scope?.join(' '),
    };
  }

  /**
   * A CONFIDENTIAL client (registered with a secret, so `clientSecretHash` is set)
   * MUST authenticate on the token endpoint — for every grant. The library is
   * configured `requireClientAuthentication.refresh_token = false` so PUBLIC / PKCE
   * clients can refresh without a secret; that also waives the demand for
   * confidential clients, so without this an attacker holding only the refresh token
   * could mint new tokens (RFC 6749 §6). We enforce it here (not in the model's
   * getClient, which the authorize flow also calls with no secret). Public clients
   * have no hash and are unaffected. Auth method is client_secret_post (body) — the
   * only confidential method this server advertises.
   */
  private async requireConfidentialClientSecret(body: unknown): Promise<void> {
    const b = (body ?? {}) as Record<string, unknown>;
    const clientId = typeof b.client_id === 'string' ? b.client_id : undefined;
    if (!clientId) {
      return; // the library rejects a missing/invalid client_id
    }
    const client = await this.prisma.oAuthClient.findUnique({
      where: { id: clientId },
      select: { clientSecretHash: true },
    });
    if (!client?.clientSecretHash) {
      return; // unknown or public client — nothing to enforce here
    }
    const presented = typeof b.client_secret === 'string' ? b.client_secret : '';
    if (!presented || hashSecret(presented) !== client.clientSecretHash) {
      throw new BadRequestException('invalid_client: client authentication failed');
    }
  }

  // ── Revoke (RFC 7009) ───────────────────────────────────────────────────────
  async revoke(token: string): Promise<void> {
    if (!token) {
      return;
    }
    // Refresh token → revoke the whole grant (+ its access tokens via guard's isActive).
    // Refresh tokens are stored/looked up as the hash of the FULL `utr_…` string
    // (saveToken / getRefreshToken), so hash it whole here — stripping the prefix
    // (as an access token needs) would never match a grant and the revoke would no-op.
    const grant = await this.prisma.oAuthGrant.findFirst({
      where: { hashedRefreshToken: hashSecret(token) },
    });
    if (grant) {
      await this.revokeGrant(grant.id);
      return;
    }
    // Access token → deactivate just that ApiToken. Access tokens are stored as the
    // hash of the BARE secret (prefix stripped), matching getAccessToken.
    const secret = accessTokenSecret(token);
    if (!secret) {
      return;
    }
    await this.prisma.apiToken.updateMany({
      where: { hashedSecret: hashSecret(secret), clientId: { not: null } },
      data: { isActive: false },
    });
  }

  /** Revoke a grant: kill its access tokens + clear the refresh lineage. */
  async revokeGrant(grantId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.apiToken.updateMany({
        where: { oauthGrantId: grantId },
        data: { isActive: false },
      }),
      this.prisma.oAuthGrant.update({
        where: { id: grantId },
        data: { revokedAt: new Date(), hashedRefreshToken: null },
      }),
    ]);
  }

  // ── Dynamic Client Registration (RFC 7591) ──────────────────────────────────
  async register(body: RegisterBody, baseUrl: string) {
    const redirectUris = Array.isArray(body.redirect_uris)
      ? (body.redirect_uris as unknown[]).map(String)
      : [];
    if (redirectUris.length === 0) {
      throw new BadRequestException('redirect_uris is required');
    }
    const invalid = redirectUris.filter((uri) => !isAllowedRedirectUri(uri));
    if (invalid.length > 0) {
      throw new BadRequestException(`redirect_uri not allowed: ${invalid.join(', ')}`);
    }

    const authMethod =
      body.token_endpoint_auth_method === 'client_secret_post' ? 'client_secret_post' : 'none';
    const clientType = authMethod === 'client_secret_post' ? 'confidential' : 'public';
    const grantTypes =
      Array.isArray(body.grant_types) && body.grant_types.length > 0
        ? (body.grant_types as unknown[]).map(String)
        : ['authorization_code', 'refresh_token'];

    const secret = clientType === 'confidential' ? generateOpaqueSecret() : null;
    const registrationAccessToken = generateOpaqueSecret();

    const client = await this.prisma.oAuthClient.create({
      data: {
        clientType,
        name: body.client_name?.slice(0, 200) || 'MCP client',
        clientSecretHash: secret ? hashSecret(secret) : null,
        redirectUris,
        grantTypes,
        logoUri: body.logo_uri ?? null,
        clientUri: body.client_uri ?? null,
        registrationAccessTokenHash: hashSecret(registrationAccessToken),
        createdByUserId: null,
      },
    });

    return {
      client_id: client.id,
      ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      client_name: client.name,
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: ['code'],
      token_endpoint_auth_method: authMethod,
      ...(client.logoUri ? { logo_uri: client.logoUri } : {}),
      ...(client.clientUri ? { client_uri: client.clientUri } : {}),
      registration_access_token: registrationAccessToken,
      registration_client_uri: `${baseUrl}/oauth/register/${client.id}`,
    };
  }

  // ── Connected apps (management) ──────────────────────────────────────────────
  /** The user's active OAuth grants, with client + project names + last use. */
  async listConnections(userId: string) {
    const grants = await this.prisma.oAuthGrant.findMany({
      // Hide dead connections: a grant whose refresh chain has expired can never
      // be used again (access tokens live 1h), so listing it as "connected" is a
      // zombie row. The row itself is kept (audit); only the listing filters.
      where: {
        userId,
        revokedAt: null,
        OR: [{ refreshExpiresAt: null }, { refreshExpiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (grants.length === 0) {
      return [];
    }
    const envIds = [
      ...new Set(
        grants.flatMap((g) =>
          Array.isArray(g.allowedEnvironmentIds) ? (g.allowedEnvironmentIds as string[]) : [],
        ),
      ),
    ];
    const [clients, projects, environments, lastUses] = await Promise.all([
      this.prisma.oAuthClient.findMany({
        where: { id: { in: [...new Set(grants.map((g) => g.clientId))] } },
        select: { id: true, name: true },
      }),
      this.prisma.project.findMany({
        where: { id: { in: [...new Set(grants.map((g) => g.projectId))] } },
        select: { id: true, name: true },
      }),
      envIds.length
        ? this.prisma.environment.findMany({
            where: { id: { in: envIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      this.prisma.apiToken.groupBy({
        by: ['oauthGrantId'],
        where: { oauthGrantId: { in: grants.map((g) => g.id) } },
        _max: { lastUsedAt: true },
      }),
    ]);
    const clientName = new Map(clients.map((c) => [c.id, c.name]));
    const projectName = new Map(projects.map((p) => [p.id, p.name]));
    const envName = new Map(environments.map((e) => [e.id, e.name]));
    const lastUsed = new Map(lastUses.map((l) => [l.oauthGrantId, l._max.lastUsedAt]));
    return grants.map((g) => {
      // null allowlist = all environments (legacy/back-compat).
      const allowed = Array.isArray(g.allowedEnvironmentIds)
        ? (g.allowedEnvironmentIds as string[])
        : null;
      return {
        id: g.id,
        clientName: clientName.get(g.clientId) ?? g.clientId,
        projectId: g.projectId,
        projectName: projectName.get(g.projectId) ?? g.projectId,
        scopes: (g.scopes as string[]) ?? [],
        environmentNames: allowed ? allowed.map((id) => envName.get(id) ?? id) : null,
        createdAt: g.createdAt,
        lastUsedAt: lastUsed.get(g.id) ?? null,
      };
    });
  }

  /** Revoke a grant the user owns (kills its access tokens + refresh). */
  async revokeConnection(userId: string, grantId: string): Promise<boolean> {
    const grant = await this.prisma.oAuthGrant.findFirst({ where: { id: grantId, userId } });
    if (!grant) {
      return false;
    }
    await this.revokeGrant(grantId);
    return true;
  }

  /** Resolve a client by its RFC 7592 registration access token (manage flow). */
  async clientForRegistrationToken(token: string) {
    if (!token) {
      return null;
    }
    return this.prisma.oAuthClient.findUnique({
      where: { registrationAccessTokenHash: hashSecret(token) },
    });
  }
}
