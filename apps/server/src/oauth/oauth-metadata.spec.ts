import { buildAuthorizationServerMetadata, buildProtectedResourceMetadata } from './oauth-metadata';

const ORIGIN = 'https://api.usertour.io';

describe('oauth discovery metadata', () => {
  it('protected-resource metadata points /mcp at this server as its own AS', () => {
    const m = buildProtectedResourceMetadata(ORIGIN);
    expect(m.resource).toBe(`${ORIGIN}/mcp`);
    expect(m.authorization_servers).toEqual([ORIGIN]);
    expect(m.bearer_methods_supported).toEqual(['header']);
    expect(m.scopes_supported).toContain('content:read');
  });

  it('authorization-server metadata advertises the OAuth 2.1 + PKCE endpoints', () => {
    const m = buildAuthorizationServerMetadata(ORIGIN);
    expect(m.issuer).toBe(ORIGIN);
    expect(m.authorization_endpoint).toBe(`${ORIGIN}/oauth/authorize`);
    expect(m.token_endpoint).toBe(`${ORIGIN}/oauth/token`);
    expect(m.registration_endpoint).toBe(`${ORIGIN}/oauth/register`);
    expect(m.revocation_endpoint).toBe(`${ORIGIN}/oauth/revoke`);
    expect(m.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
    expect(m.code_challenge_methods_supported).toEqual(['S256']);
    expect(m.token_endpoint_auth_methods_supported).toEqual(['client_secret_post', 'none']);
  });
});
