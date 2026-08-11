import { isAllowedRedirectUri, matchesRegisteredRedirectUri } from './redirect-allowlist';

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

  it('rejects userinfo', () => {
    expect(isAllowedRedirectUri('https://user:pw@vscode.dev/cb')).toBe(false);
    expect(isAllowedRedirectUri('http://user@127.0.0.1:3000/cb')).toBe(false);
  });
});

describe('matchesRegisteredRedirectUri', () => {
  it('matches exact registered URIs', () => {
    expect(
      matchesRegisteredRedirectUri(['https://vscode.dev/redirect'], 'https://vscode.dev/redirect'),
    ).toBe(true);
  });

  it('treats an empty path and "/" as the same URI', () => {
    expect(
      matchesRegisteredRedirectUri(['http://127.0.0.1:33418'], 'http://127.0.0.1:33418/'),
    ).toBe(true);
    expect(
      matchesRegisteredRedirectUri(['http://127.0.0.1:33418/'], 'http://127.0.0.1:33418'),
    ).toBe(true);
  });

  it('ignores the port for loopback hosts (RFC 8252)', () => {
    expect(
      matchesRegisteredRedirectUri(['http://127.0.0.1:33418'], 'http://127.0.0.1:51000/'),
    ).toBe(true);
    expect(
      matchesRegisteredRedirectUri(['http://localhost:3118/callback'], 'http://localhost/callback'),
    ).toBe(true);
    expect(matchesRegisteredRedirectUri(['http://[::1]:8080/cb'], 'http://[::1]:9090/cb')).toBe(
      true,
    );
  });

  it('still requires scheme, host, path, and query to match on loopback', () => {
    expect(
      matchesRegisteredRedirectUri(['http://127.0.0.1:33418/cb'], 'http://127.0.0.1:33418/other'),
    ).toBe(false);
    expect(
      matchesRegisteredRedirectUri(['http://127.0.0.1:33418/'], 'https://127.0.0.1:33418/'),
    ).toBe(false);
    expect(matchesRegisteredRedirectUri(['http://localhost/cb'], 'http://127.0.0.1/cb')).toBe(
      false,
    );
    expect(
      matchesRegisteredRedirectUri(['http://127.0.0.1/cb?a=1'], 'http://127.0.0.1/cb?a=2'),
    ).toBe(false);
  });

  it('keeps non-loopback hosts on exact ports', () => {
    expect(
      matchesRegisteredRedirectUri(
        ['https://vscode.dev/redirect'],
        'https://vscode.dev:8443/redirect',
      ),
    ).toBe(false);
  });

  it('matches custom-scheme URIs with or without a trailing slash', () => {
    expect(matchesRegisteredRedirectUri(['vscode://callback'], 'vscode://callback/')).toBe(true);
  });

  it('rejects fragments and userinfo in the requested URI', () => {
    expect(
      matchesRegisteredRedirectUri(['http://127.0.0.1:33418'], 'http://127.0.0.1:33418/#steal'),
    ).toBe(false);
    expect(
      matchesRegisteredRedirectUri(
        ['https://vscode.dev/redirect'],
        'https://user:pw@vscode.dev/redirect',
      ),
    ).toBe(false);
    expect(
      matchesRegisteredRedirectUri(['http://127.0.0.1:33418'], 'http://user@127.0.0.1:33418/'),
    ).toBe(false);
  });

  it('rejects unparseable input', () => {
    expect(matchesRegisteredRedirectUri(['not-a-url'], 'http://127.0.0.1/')).toBe(false);
    expect(matchesRegisteredRedirectUri(['http://127.0.0.1/'], 'not-a-url')).toBe(false);
    expect(matchesRegisteredRedirectUri([], 'http://127.0.0.1/')).toBe(false);
  });
});

describe('Cursor 3.14 DCR shape', () => {
  it('accepts every redirect_uri Cursor registers', () => {
    // The exact trio from a traced Cursor 3.14.7 registration; www.cursor.com
    // missing from ALLOWED_HOSTS rejected the whole DCR request.
    for (const uri of [
      'cursor://anysphere.cursor-mcp/oauth/callback',
      'https://www.cursor.com/agents/mcp/oauth/callback',
      'http://localhost:8787/callback',
    ]) {
      expect(isAllowedRedirectUri(uri)).toBe(true);
    }
  });
});
