import { Injectable } from '@nestjs/common';
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
  constructor(private readonly configService: ConfigService) {}

  buildCallbackUrl(providerId: string): string {
    const apiUrl = this.configService.get<string>('app.apiUrl') ?? '';
    return `${apiUrl}/api/auth/sso/${providerId}/callback`;
  }

  private async buildClient(provider: ProjectSSOIdentityProvider): Promise<Client> {
    const issuer = await Issuer.discover(provider.issuer);
    return new issuer.Client({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      redirect_uris: [this.buildCallbackUrl(provider.id)],
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
    const tokenSet = await client.callback(this.buildCallbackUrl(provider.id), params as any, {
      state: checks.state,
      nonce: checks.nonce,
      code_verifier: checks.codeVerifier,
    });
    return tokenSet.claims();
  }
}
