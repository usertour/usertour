import axios from 'axios';
import { hubspotCall } from './hubspot-errors';

/**
 * HubSpot OAuth + account endpoints (ADR 0013 §2-3). Fixed public hosts, so
 * no egress guard is involved. Every function is a thin typed wrapper: the
 * connection service owns retries, locking and persistence.
 */
export const HUBSPOT_AUTHORIZE_URL = 'https://app.hubspot.com/oauth/authorize';
export const HUBSPOT_API_BASE = 'https://api.hubapi.com';

/**
 * OAuth API version (HubSpot's date-based versioning). Token exchange,
 * introspection and revocation all live under it — and so does the app-level
 * token for the change journal (hubspot-journal-api.ts) — so a bump is one
 * edit. The unversioned `/oauth/v1/*` endpoints put secrets in the URL, are
 * refused for new marketplace listings and are sunset on 2027-02-16.
 */
export const HUBSPOT_OAUTH_API_VERSION = '2026-09';
export const HUBSPOT_OAUTH_TOKEN_URL = `${HUBSPOT_API_BASE}/oauth/${HUBSPOT_OAUTH_API_VERSION}/token`;

/**
 * Must equal `requiredScopes` in integrations/hubspot/src/app/app-hsmeta.json —
 * HubSpot refuses an authorize request whose scope set differs from the app's.
 */
export const HUBSPOT_OAUTH_SCOPES = [
  'oauth',
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.companies.read',
  'crm.objects.companies.write',
  'crm.schemas.contacts.read',
  'crm.schemas.contacts.write',
  'crm.schemas.companies.read',
  'crm.schemas.companies.write',
  // App events (timeline): occurrences on contact and company records (ADR 0013 §8).
  'timeline.write',
] as const;

export interface HubspotAppCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface HubspotTokenResponse {
  access_token: string;
  refresh_token: string;
  /** Seconds until the access token expires (HubSpot: 1800). */
  expires_in: number;
}

/** Introspection of an access token: the HubSpot account (hub) it belongs to. */
export interface HubspotTokenInfo {
  hub_id: number;
  hub_domain: string;
  app_id: number;
  user: string;
  user_id: number;
  scopes: string[];
}

const TOKEN_TIMEOUT_MS = 10_000;

export const buildHubspotAuthorizeUrl = (app: HubspotAppCredentials, state: string): string => {
  const params = new URLSearchParams({
    client_id: app.clientId,
    redirect_uri: app.redirectUri,
    scope: HUBSPOT_OAUTH_SCOPES.join(' '),
    state,
  });
  return `${HUBSPOT_AUTHORIZE_URL}?${params.toString()}`;
};

/** Every OAuth endpoint takes a form body — the app secret and tokens never appear in a URL. */
const postOAuthForm = <T>(url: string, form: Record<string, string>): Promise<T> =>
  hubspotCall(async () => {
    const response = await axios.post<T>(url, new URLSearchParams(form).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: TOKEN_TIMEOUT_MS,
    });
    return response.data;
  });

export const exchangeHubspotCode = (app: HubspotAppCredentials, code: string) =>
  postOAuthForm<HubspotTokenResponse>(HUBSPOT_OAUTH_TOKEN_URL, {
    grant_type: 'authorization_code',
    client_id: app.clientId,
    client_secret: app.clientSecret,
    redirect_uri: app.redirectUri,
    code,
  });

export const refreshHubspotToken = (app: HubspotAppCredentials, refreshToken: string) =>
  postOAuthForm<HubspotTokenResponse>(HUBSPOT_OAUTH_TOKEN_URL, {
    grant_type: 'refresh_token',
    client_id: app.clientId,
    client_secret: app.clientSecret,
    refresh_token: refreshToken,
  });

/**
 * Introspect an access token for the account it belongs to. HubSpot answers
 * 200 with `active: false` for a token it does not know, so that case becomes
 * an error here rather than a missing hub id at the caller.
 */
export const fetchHubspotTokenInfo = async (
  app: HubspotAppCredentials,
  accessToken: string,
): Promise<HubspotTokenInfo> => {
  const info = await postOAuthForm<HubspotTokenInfo & { active: boolean }>(
    `${HUBSPOT_OAUTH_TOKEN_URL}/introspect`,
    {
      client_id: app.clientId,
      client_secret: app.clientSecret,
      token: accessToken,
      token_type_hint: 'access_token',
    },
  );
  if (!info.active) {
    throw new Error('HubSpot does not recognise the access token it just issued');
  }
  return info;
};

/**
 * Best-effort revocation on disconnect. HubSpot invalidates the refresh token
 * (answering 200 whether or not it knew the token, per RFC 7009); the app
 * stays listed in the account until the customer uninstalls it there.
 * Whether other authorizations of the same app in the same account survive
 * is not something to rely on either way: a 401 on a data call is handled
 * as "refresh once, then treat as revoked" (ProviderConnectionService), so a
 * revocation from anywhere surfaces as a reconnect prompt, never as retries.
 */
export const revokeHubspotRefreshToken = async (
  app: HubspotAppCredentials,
  refreshToken: string,
): Promise<void> => {
  await postOAuthForm<unknown>(`${HUBSPOT_OAUTH_TOKEN_URL}/revoke`, {
    client_id: app.clientId,
    client_secret: app.clientSecret,
    token: refreshToken,
    token_type_hint: 'refresh_token',
  });
};

/**
 * Whether a token-endpoint failure means the grant itself is gone (revoked /
 * uninstalled). HubSpot answers 400 for that (`invalid_grant`) but also for a
 * wrong client secret (`invalid_client`) — a server misconfiguration, which
 * must not be reported to the operator as a revoked connection.
 */
export const isHubspotGrantRevoked = (error: unknown): boolean => {
  if (!axios.isAxiosError(error) || !error.response) {
    return false;
  }
  const { status, data } = error.response;
  if (status === 401) {
    return true;
  }
  if (status !== 400) {
    return false;
  }
  // Documented body: { error: 'invalid_grant', status: 'BAD_REFRESH_TOKEN', ... };
  // either marker alone is enough, and a body that arrived as text still counts.
  const body = typeof data === 'string' ? data : JSON.stringify(data ?? {});
  return body.includes('invalid_grant') || body.includes('BAD_REFRESH_TOKEN');
};
