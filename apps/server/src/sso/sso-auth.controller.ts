import { Controller, Get, Logger, Param, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { Public } from '@/common/decorators/public.decorator';
import { OAuthError, SsoAccessDeniedError } from '@/common/errors';
import { SSO_TX_COOKIE } from '@/utils/cookie';

import { SsoOidcService } from './sso-oidc.service';
import { SsoService } from './sso.service';

/**
 * Per-project OIDC SSO login. SP-initiated entry is
 * `GET /api/auth/sso/:providerId` (the URL an admin distributes / wires into
 * their IdP app); the IdP redirects back to `/callback`. Both are Public — the
 * project context comes from the provider row, not an authenticated session.
 */
@Controller('api/auth/sso')
export class SsoAuthController {
  private readonly logger = new Logger(SsoAuthController.name);

  constructor(
    private readonly ssoService: SsoService,
    private readonly ssoOidcService: SsoOidcService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Single fixed callback for every provider — the providerId travels in our
  // own signed tx cookie (set at initiate), not the path, so one redirect URI
  // is registered per deployment. Declared before the `:providerId` initiate
  // route so `/callback` matches this literal route, not `:providerId`.
  @Get('callback')
  @Public()
  async callback(@Req() req: Request, @Res() res: Response) {
    // Tracked once the provider loads so a failure can route back to that
    // project's SSO entry (with an error) rather than a bare 500.
    let projectId: string | undefined;
    try {
      const cookie = req.cookies?.[SSO_TX_COOKIE];
      if (!cookie) {
        throw new OAuthError();
      }
      const tx = await this.jwtService.verifyAsync(cookie).catch(() => null);
      if (!tx || tx.tokenType !== 'sso-tx' || !tx.providerId) {
        throw new OAuthError();
      }

      const provider = await this.loadActiveEntitledProvider(tx.providerId);
      projectId = provider.projectId;
      const claims = await this.ssoOidcService.exchangeCallback(provider, req.query as any, {
        state: tx.state,
        nonce: tx.nonce,
        codeVerifier: tx.codeVerifier,
      });
      if (!claims.email) {
        throw new OAuthError();
      }

      // Provisioning policy is project-level now, not per-provider.
      const settings = await this.ssoService.getSettings(provider.projectId);
      const user = await this.authService.ssoValidate(
        {
          provider: `oidc:${provider.id}`,
          id: claims.sub,
          emails: [{ value: String(claims.email), verified: claims.email_verified }],
          displayName: claims.name ? String(claims.name) : undefined,
        },
        {
          projectId: provider.projectId,
          autoProvision: settings.autoProvision,
          defaultRole: settings.defaultRole,
          allowedDomains: settings.allowedDomains,
        },
      );

      res.clearCookie(SSO_TX_COOKIE, { path: '/api/auth/sso' });
      await this.finishSso(user.id, res);
    } catch (error) {
      this.logger.error(`SSO callback failed: ${error?.stack ?? error}`);
      res.clearCookie(SSO_TX_COOKIE, { path: '/api/auth/sso' });
      this.redirectToSsoError(res, error, projectId);
    }
  }

  @Get(':providerId')
  @Public()
  async initiate(@Param('providerId') providerId: string, @Res() res: Response) {
    try {
      const provider = await this.loadActiveEntitledProvider(providerId);
      const { url, state, nonce, codeVerifier } =
        await this.ssoOidcService.createAuthRequest(provider);
      const tx = await this.jwtService.signAsync(
        { tokenType: 'sso-tx', providerId, state, nonce, codeVerifier },
        { expiresIn: '10m' },
      );
      res.cookie(SSO_TX_COOKIE, tx, {
        httpOnly: true,
        secure: !!this.configService.get('auth.cookie.secure'),
        // Must be 'lax' (not 'strict') so the cookie is sent on the top-level
        // GET navigation the IdP makes back to /callback.
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
        path: '/api/auth/sso',
      });
      res.redirect(url);
    } catch (error) {
      this.logger.error(`SSO initiate failed: ${error?.stack ?? error}`);
      this.redirectToSsoError(res, error);
    }
  }

  // SSO entry/callback are top-level browser navigations, so a failure must land
  // the user on a friendly page — never a raw 500. "access_denied" (the IdP
  // authenticated them but they're not allowed into the project) routes back to
  // the project's SSO entry with an actionable message; anything else is a
  // generic failure on the sign-in page.
  private redirectToSsoError(res: Response, error: unknown, projectId?: string) {
    const homepage = this.configService.get<string>('app.homepageUrl') || '';
    const reason = error instanceof SsoAccessDeniedError ? 'access_denied' : 'failed';
    const target =
      reason === 'access_denied' && projectId
        ? `${homepage}/auth/sso/${projectId}?error=access_denied`
        : `${homepage}/auth/signin?error=sso`;
    res.redirect(target);
  }

  private async loadActiveEntitledProvider(providerId: string) {
    const provider = await this.ssoService.findById(providerId);
    if (!provider || provider.status !== 'active') {
      throw new OAuthError();
    }
    // Live entitlement check: a downgraded/expired project cannot SSO even
    // though the provider row still exists.
    await this.ssoService.assertOidcEntitled(provider.projectId);
    return provider;
  }

  // Mirror of AuthController.finishOauth: land on the SPA with auth cookies, or
  // redirect into the 2FA second step with a short-lived challenge token.
  private async finishSso(userId: string, res: Response) {
    // viaSso=true: this IS the SSO path, so it must never be blocked by the
    // project's own force-SSO enforcement.
    const result = await this.authService.issueTokensOrChallenge(userId, true);
    const homepage = this.configService.get<string>('app.homepageUrl') || '';
    if (result.kind === 'tokens') {
      this.authService.setAuthCookie(res, result.tokens).redirect(homepage || '/');
      return;
    }
    const path = result.purpose === 'mfa-verify' ? '/auth/2fa' : '/auth/2fa/setup';
    res.redirect(`${homepage}${path}?challenge=${encodeURIComponent(result.challengeToken)}`);
  }
}
