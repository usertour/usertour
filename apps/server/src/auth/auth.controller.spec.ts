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

  it('routes a force-SSO social login to the project SSO entry (not a generic error)', async () => {
    const res = makeRes();
    const auth = {
      issueTokensOrChallenge: jest.fn().mockRejectedValue(new SsoRequiredError('proj-1')),
      setAuthCookie: jest.fn(),
    } as any;
    const controller = new AuthController(auth, config);

    await controller.githubAuthCallback({ id: 'u1', email: 'a@b.co' } as any, res);

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

    await controller.googleAuthCallback({ id: 'u1', email: 'a@b.co' } as any, res);

    expect(auth.setAuthCookie).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(homepage);
  });
});
