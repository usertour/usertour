import { isAllowedRedirectUri } from './redirect-allowlist';

describe('isAllowedRedirectUri', () => {
  it('allows loopback http/https on any port', () => {
    expect(isAllowedRedirectUri('http://127.0.0.1:51000/callback')).toBe(true);
    expect(isAllowedRedirectUri('http://localhost/callback')).toBe(true);
    expect(isAllowedRedirectUri('https://localhost:8443/cb')).toBe(true);
  });

  it('allows known native client schemes', () => {
    expect(isAllowedRedirectUri('cursor://anysphere.cursor-retrieval/oauth/callback')).toBe(true);
    expect(isAllowedRedirectUri('vscode://callback')).toBe(true);
  });

  it('allows known vendor https callbacks, exact host', () => {
    expect(isAllowedRedirectUri('https://claude.ai/api/mcp/auth_callback')).toBe(true);
    expect(isAllowedRedirectUri('https://chatgpt.com/connector_platform_oauth_redirect')).toBe(
      true,
    );
  });

  it('rejects arbitrary external https hosts', () => {
    expect(isAllowedRedirectUri('https://evil.example.com/cb')).toBe(false);
    expect(isAllowedRedirectUri('https://claude.ai.evil.com/cb')).toBe(false);
  });

  it('rejects non-loopback http and fragments and junk', () => {
    expect(isAllowedRedirectUri('http://example.com/cb')).toBe(false);
    expect(isAllowedRedirectUri('https://localhost/cb#frag')).toBe(false);
    expect(isAllowedRedirectUri('not-a-url')).toBe(false);
    expect(isAllowedRedirectUri('')).toBe(false);
  });
});
