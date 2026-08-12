import { AuthController } from './auth.controller';
import { SsoRequiredError } from '@/common/errors';

// Covers finishOauth's branches reached via the social (Google/GitHub) callbacks:
// the force-SSO redirect and the normal token landing. The callbacks wrap
// finishOauth in a try/catch that rethrows OAuthError, so a handled
// SsoRequiredError must NOT surface as an error.
describe('AuthController — social OAuth callback', () => {
  const homepage = 'https://app.test';
  const config = {
    get: (key: string) => (key === 'app.homepageUrl' ? homepage : undefined),
  } as any;
  const makeRes = () => ({ redirect: jest.fn() }) as any;
  /** A callback request whose OAuth state carries the given payload. */
  const makeReq = (statePayload?: Record<string, unknown>) =>
    ({
      query: statePayload
        ? { state: Buffer.from(JSON.stringify(statePayload)).toString('base64') }
        : {},
    }) as any;

  it('routes a force-SSO social login to the project SSO entry (not a generic error)', async () => {
    const res = makeRes();
    const auth = {
      issueTokensOrChallenge: jest.fn().mockRejectedValue(new SsoRequiredError('proj-1')),
      setAuthCookie: jest.fn(),
    } as any;
    const controller = new AuthController(auth, config);

    await controller.githubAuthCallback({ id: 'u1', email: 'a@b.co' } as any, makeReq(), res);

    expect(res.redirect).toHaveBeenCalledWith(`${homepage}/auth/sso/proj-1`);
    expect(auth.setAuthCookie).not.toHaveBeenCalled();
  });

  it('lands a normal social login at the SPA root with auth cookies', async () => {
    const res = makeRes();
    const auth = {
      issueTokensOrChallenge: jest.fn().mockResolvedValue({ kind: 'tokens', tokens: {} }),
      setAuthCookie: jest.fn().mockReturnValue(res),
    } as any;
    const controller = new AuthController(auth, config);

    await controller.googleAuthCallback({ id: 'u1', email: 'a@b.co' } as any, makeReq(), res);

    expect(auth.setAuthCookie).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(homepage);
  });

  it('resumes an interrupted flow: `next` from the OAuth state survives the login', async () => {
    // The field case: MCP consent page -> signin -> Google -> callback. The
    // consent path rides the state round-trip and the callback lands ON it —
    // before this, the callback hard-redirected to the homepage and the whole
    // MCP authorization died quietly.
    const res = makeRes();
    const auth = {
      issueTokensOrChallenge: jest.fn().mockResolvedValue({ kind: 'tokens', tokens: {} }),
      setAuthCookie: jest.fn().mockReturnValue(res),
    } as any;
    const controller = new AuthController(auth, config);

    const next = '/oauth-consent?transaction=abc';
    await controller.googleAuthCallback({ id: 'u1' } as any, makeReq({ next }), res);

    expect(res.redirect).toHaveBeenCalledWith(`${homepage}${next}`);
  });

  it('resumes even when `next` is long: the MCP transaction JWT (~590 chars) is NOT truncated away', async () => {
    // The field bug: a 512-char cap dropped the real MCP next (transaction JWT
    // = all scopes + PKCE), so the flow this feature resumes was the one it
    // silently killed. Pin a next longer than 512.
    const res = makeRes();
    const auth = {
      issueTokensOrChallenge: jest.fn().mockResolvedValue({ kind: 'tokens', tokens: {} }),
      setAuthCookie: jest.fn().mockReturnValue(res),
    } as any;
    const controller = new AuthController(auth, config);

    const longNext = `/oauth-consent?transaction=${'x'.repeat(600)}`;
    expect(longNext.length).toBeGreaterThan(512);
    await controller.googleAuthCallback({ id: 'u1' } as any, makeReq({ next: longNext }), res);

    expect(res.redirect).toHaveBeenCalledWith(`${homepage}${longNext}`);
  });

  it('refuses a non-same-origin `next` (open-redirect guard): falls back to homepage', async () => {
    const res = makeRes();
    const auth = {
      issueTokensOrChallenge: jest.fn().mockResolvedValue({ kind: 'tokens', tokens: {} }),
      setAuthCookie: jest.fn().mockReturnValue(res),
    } as any;
    const controller = new AuthController(auth, config);

    for (const evil of ['https://evil.example.com/x', '//evil.example.com', 'oauth-consent']) {
      await controller.googleAuthCallback({ id: 'u1' } as any, makeReq({ next: evil }), res);
      expect(res.redirect).toHaveBeenLastCalledWith(homepage);
    }
  });

  it('forwards `next` through the 2FA challenge redirect', async () => {
    const res = makeRes();
    const auth = {
      issueTokensOrChallenge: jest
        .fn()
        .mockResolvedValue({ kind: 'challenge', purpose: 'mfa-verify', challengeToken: 'ch1' }),
      setAuthCookie: jest.fn(),
    } as any;
    const controller = new AuthController(auth, config);

    await controller.googleAuthCallback(
      { id: 'u1' } as any,
      makeReq({ next: '/oauth-consent?transaction=abc' }),
      res,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      `${homepage}/auth/2fa?challenge=ch1&next=${encodeURIComponent('/oauth-consent?transaction=abc')}`,
    );
  });
});
