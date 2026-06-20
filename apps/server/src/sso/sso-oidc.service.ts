import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProjectSSOIdentityProvider } from '@prisma/client';
import { Client, Issuer, generators } from 'openid-client';

export interface OidcAuthRequest {
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

/**
 * Thin wrapper over openid-client for the per-project OIDC flow. The client is
 * built per-request from the provider row (v1 discovers endpoints from the
 * issuer's /.well-known/openid-configuration, which every major IdP — Okta,
 * Azure Entra, Auth0, OneLogin, Authentik, Google — exposes).
 */
@Injectable()
export class SsoOidcService {
  private readonly logger = new Logger(SsoOidcService.name);

  constructor(private readonly configService: ConfigService) {}

  // One fixed callback for every provider; the provider is resolved from the
  // signed tx cookie, so this is the single redirect URI to register at the IdP.
  buildCallbackUrl(): string {
    const apiUrl = this.configService.get<string>('app.apiUrl') ?? '';
    return `${apiUrl}/api/auth/sso/callback`;
  }

  private async buildClient(provider: ProjectSSOIdentityProvider): Promise<Client> {
    const issuer = await Issuer.discover(provider.issuer);
    return new issuer.Client({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      redirect_uris: [this.buildCallbackUrl()],
      response_types: ['code'],
    });
  }

  async createAuthRequest(provider: ProjectSSOIdentityProvider): Promise<OidcAuthRequest> {
    const client = await this.buildClient(provider);
    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const url = client.authorizationUrl({
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return { url, state, nonce, codeVerifier };
  }

  async exchangeCallback(
    provider: ProjectSSOIdentityProvider,
    params: Record<string, string>,
    checks: { state: string; nonce: string; codeVerifier: string },
  ) {
    const client = await this.buildClient(provider);
    const tokenSet = await client.callback(this.buildCallbackUrl(), params as any, {
      state: checks.state,
      nonce: checks.nonce,
      code_verifier: checks.codeVerifier,
    });
    const claims = tokenSet.claims();
    // Some IdPs (notably Azure Entra) omit `email` from the ID token. Only then
    // do we hit the userinfo endpoint and merge its richer claims in — keeping
    // the common case to a single round-trip. Mirrors how Twenty/Bytebase
    // source identity when the ID token alone is insufficient.
    if (!claims.email) {
      try {
        const userinfo = await client.userinfo(tokenSet);
        return { ...claims, ...userinfo };
      } catch (error) {
        this.logger.warn(
          `SSO userinfo fallback failed for project=${provider.projectId}: ${
            error?.message ?? error
          }`,
        );
      }
    }
    return claims;
  }
}
