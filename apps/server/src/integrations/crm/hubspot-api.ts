import axios from 'axios';

/**
 * HubSpot OAuth + account endpoints (ADR 0013 §2-3). Fixed public hosts, so
 * no egress guard is involved. Every function is a thin typed wrapper: the
 * connection service owns retries, locking and persistence.
 */
export const HUBSPOT_AUTHORIZE_URL = 'https://app.hubspot.com/oauth/authorize';
export const HUBSPOT_API_BASE = 'https://api.hubapi.com';

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

const postTokenForm = async (form: Record<string, string>): Promise<HubspotTokenResponse> => {
  const response = await axios.post<HubspotTokenResponse>(
    `${HUBSPOT_API_BASE}/oauth/v1/token`,
    new URLSearchParams(form).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: TOKEN_TIMEOUT_MS,
    },
  );
  return response.data;
};

export const exchangeHubspotCode = (app: HubspotAppCredentials, code: string) =>
  postTokenForm({
    grant_type: 'authorization_code',
    client_id: app.clientId,
    client_secret: app.clientSecret,
    redirect_uri: app.redirectUri,
    code,
  });

export const refreshHubspotToken = (app: HubspotAppCredentials, refreshToken: string) =>
  postTokenForm({
    grant_type: 'refresh_token',
    client_id: app.clientId,
    client_secret: app.clientSecret,
    redirect_uri: app.redirectUri,
    refresh_token: refreshToken,
  });

/** Metadata for an access token: the HubSpot account (hub) it belongs to. */
export const fetchHubspotTokenInfo = async (accessToken: string): Promise<HubspotTokenInfo> => {
  const response = await axios.get<HubspotTokenInfo>(
    `${HUBSPOT_API_BASE}/oauth/v1/access-tokens/${encodeURIComponent(accessToken)}`,
    { timeout: TOKEN_TIMEOUT_MS },
  );
  return response.data;
};

/**
 * Best-effort revocation on disconnect. HubSpot only invalidates the refresh
 * token (outstanding access tokens live out their 30 minutes) and does not
 * uninstall the app from the account — the customer does that in HubSpot.
 */
export const revokeHubspotRefreshToken = async (refreshToken: string): Promise<void> => {
  await axios.delete(
    `${HUBSPOT_API_BASE}/oauth/v1/refresh-tokens/${encodeURIComponent(refreshToken)}`,
    { timeout: TOKEN_TIMEOUT_MS },
  );
};

/** Whether a token-endpoint failure means the grant itself is gone (revoked / uninstalled). */
export const isHubspotGrantRevoked = (error: unknown): boolean =>
  axios.isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 401);
