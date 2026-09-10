import axios, { AxiosError, AxiosHeaders } from 'axios';
import {
  HUBSPOT_OAUTH_TOKEN_URL,
  exchangeHubspotCode,
  fetchHubspotTokenInfo,
  isHubspotGrantRevoked,
  isHubspotReturnUrl,
  refreshHubspotToken,
  revokeHubspotRefreshToken,
  withHubspotState,
} from './hubspot-api';

const tokenFailure = (status: number, data: unknown) =>
  new AxiosError('request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: '',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
    data,
  });

describe('isHubspotGrantRevoked', () => {
  it('recognises the documented dead-refresh-token body by either marker', () => {
    expect(
      isHubspotGrantRevoked(
        tokenFailure(400, { error: 'invalid_grant', status: 'BAD_REFRESH_TOKEN' }),
      ),
    ).toBe(true);
    expect(isHubspotGrantRevoked(tokenFailure(400, { status: 'BAD_REFRESH_TOKEN' }))).toBe(true);
    expect(isHubspotGrantRevoked(tokenFailure(400, '{"error":"invalid_grant"}'))).toBe(true);
    expect(isHubspotGrantRevoked(tokenFailure(401, {}))).toBe(true);
  });

  it('does not mistake a misconfigured app for a revoked grant', () => {
    expect(
      isHubspotGrantRevoked(
        tokenFailure(400, { error: 'invalid_client', status: 'BAD_CLIENT_ID' }),
      ),
    ).toBe(false);
    expect(isHubspotGrantRevoked(tokenFailure(500, {}))).toBe(false);
    expect(isHubspotGrantRevoked(new Error('boom'))).toBe(false);
  });
});

describe('OAuth endpoints', () => {
  const app = { clientId: 'client-1', clientSecret: 'secret-1', redirectUri: 'https://x/cb' };
  const post = jest.spyOn(axios, 'post');
  const answer = (data: unknown) => post.mockResolvedValueOnce({ data } as never);
  const requestOf = (call: number) => ({
    url: post.mock.calls[call][0],
    body: Object.fromEntries(new URLSearchParams(String(post.mock.calls[call][1]))),
  });

  afterEach(() => {
    post.mockReset();
  });

  it('uses a date-versioned token endpoint and posts the secret in the body', async () => {
    const tokens = { access_token: 'a', refresh_token: 'r', expires_in: 1800 };
    answer(tokens);
    answer(tokens);
    await exchangeHubspotCode(app, 'code-1');
    await refreshHubspotToken(app, 'refresh-1');
    expect(HUBSPOT_OAUTH_TOKEN_URL).toMatch(/\/oauth\/\d{4}-\d{2}\/token$/);
    expect(requestOf(0)).toEqual({
      url: HUBSPOT_OAUTH_TOKEN_URL,
      body: {
        grant_type: 'authorization_code',
        client_id: 'client-1',
        client_secret: 'secret-1',
        redirect_uri: 'https://x/cb',
        code: 'code-1',
      },
    });
    expect(requestOf(1)).toEqual({
      url: HUBSPOT_OAUTH_TOKEN_URL,
      body: {
        grant_type: 'refresh_token',
        client_id: 'client-1',
        client_secret: 'secret-1',
        refresh_token: 'refresh-1',
      },
    });
  });

  it('introspects with the client credentials and refuses an inactive token', async () => {
    answer({ active: true, hub_id: 42, hub_domain: 'acme.hubspot.com' });
    await expect(fetchHubspotTokenInfo(app, 'access-1')).resolves.toMatchObject({ hub_id: 42 });
    expect(requestOf(0)).toEqual({
      url: `${HUBSPOT_OAUTH_TOKEN_URL}/introspect`,
      body: {
        client_id: 'client-1',
        client_secret: 'secret-1',
        token: 'access-1',
        token_type_hint: 'access_token',
      },
    });
    // HubSpot answers 200 for an unknown token; only `active` tells.
    answer({ active: false });
    await expect(fetchHubspotTokenInfo(app, 'access-2')).rejects.toThrow(/recognise/);
  });

  it('revokes by posting the refresh token, never in the path', async () => {
    answer('');
    await revokeHubspotRefreshToken(app, 'refresh-1');
    expect(requestOf(0)).toEqual({
      url: `${HUBSPOT_OAUTH_TOKEN_URL}/revoke`,
      body: {
        client_id: 'client-1',
        client_secret: 'secret-1',
        token: 'refresh-1',
        token_type_hint: 'refresh_token',
      },
    });
  });
});

describe('marketplace returnUrl', () => {
  it('accepts HubSpot app hosts (any hublet) over https and nothing else', () => {
    expect(isHubspotReturnUrl('https://app.hubspot.com/oauth/finish?portalId=1')).toBe(true);
    expect(isHubspotReturnUrl('https://app-eu1.hubspot.com/x')).toBe(true);
    expect(isHubspotReturnUrl('http://app.hubspot.com/x')).toBe(false);
    expect(isHubspotReturnUrl('https://app.hubspot.com.evil.example/x')).toBe(false);
    expect(isHubspotReturnUrl('https://evil.example/?u=app.hubspot.com')).toBe(false);
    expect(isHubspotReturnUrl('not a url')).toBe(false);
    expect(isHubspotReturnUrl(undefined)).toBe(false);
  });

  it('appends the state to whatever query the returnUrl already carries', () => {
    expect(withHubspotState('https://app.hubspot.com/finish?portalId=1', 'st')).toBe(
      'https://app.hubspot.com/finish?portalId=1&state=st',
    );
    expect(withHubspotState('https://app.hubspot.com/finish', 'a b')).toBe(
      'https://app.hubspot.com/finish?state=a+b',
    );
  });
});
