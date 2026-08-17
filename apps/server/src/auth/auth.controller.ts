import { Controller, Get, Post, UseGuards, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { GithubOauthGuard } from './guard/github-oauth.guard';
import { GoogleOauthGuard } from './guard/google-oauth.guard';
import { Public } from '../common/decorators/public.decorator';
import { UserEntity } from '../common/decorators/user.decorator';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';
import { User } from '@/users/models/user.model';
import { AuthenticationExpiredError, OAuthError, SsoRequiredError } from '@/common/errors';
import { REFRESH_TOKEN_COOKIE } from '@/utils/cookie';

/**
 * Same-origin `next` path from the OAuth `state` round-trip, or undefined.
 * State is CLIENT-controlled input echoed back by the provider, so this is the
 * load-bearing validation: only a relative path ('/x', never '//x' or an
 * absolute URL) may become a redirect target — anything else would be an open
 * redirect. Mirrors the web's resolveNextPath rules.
 */
function nextFromState(req: Request): string | undefined {
  const state = req.query?.state;
  if (typeof state !== 'string' || !state) {
    return undefined;
  }
  try {
    const next = JSON.parse(Buffer.from(state, 'base64').toString()).next;
    // 2048, not 512: the MCP consent path carries a `transaction` JWT (all
    // granted scopes + PKCE challenge), so a real `next` is ~590 chars — a
    // 512 cap silently dropped exactly the flow this exists to resume. The
    // bound only guards against an absurdly long state, not business length.
    if (
      typeof next === 'string' &&
      next.startsWith('/') &&
      !next.startsWith('//') &&
      next.length <= 2048
    ) {
      return next;
    }
  } catch {
    /* malformed state is the strategy's problem (it throws OAuthError) */
  }
  return undefined;
}

/**
 * Landing for a freshly created self-serve social signup: the post-signup
 * onboarding step (starting-point choice), mirroring what the email channel
 * does client-side. Fires exactly once — the creation-time `isNewUser` flag
 * from oauthValidate — and only when no explicit `next` resumes another flow.
 * Missing the step is deliberate best-effort: everything it offers stays
 * reachable under Settings → MCP.
 */
function onboardingLanding(user: { isNewUser?: boolean }): string | undefined {
  // NOT under /auth/: the web's Apollo error middleware treats that prefix
  // as sessionless and would skip token refresh on this logged-in page.
  return user.isNewUser ? '/onboarding/connect-ai' : undefined;
}

@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('github')
  @UseGuards(GithubOauthGuard)
  @Public()
  github() {
    // auth guard will handle the redirect to GitHub
  }

  @Get('google')
  @UseGuards(GoogleOauthGuard)
  @Public()
  google() {
    // auth guard will handle the redirect to Google
  }

  @UseGuards(GithubOauthGuard)
  @Get('github/callback')
  @Public()
  async githubAuthCallback(
    @UserEntity() user: User & { isNewUser?: boolean },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`github oauth callback success, req.user = ${user?.email}`);
      await this.finishOauth(user.id, res, nextFromState(req) ?? onboardingLanding(user));
    } catch (error) {
      this.logger.error('GitHub OAuth callback failed:', error.stack);
      throw new OAuthError();
    }
  }

  @UseGuards(GoogleOauthGuard)
  @Get('google/callback')
  @Public()
  async googleAuthCallback(
    @UserEntity() user: User & { isNewUser?: boolean },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`google oauth callback success, req.user = ${user?.email}`);
      await this.finishOauth(user.id, res, nextFromState(req) ?? onboardingLanding(user));
    } catch (error) {
      this.logger.error('Google OAuth callback failed:', error.stack);
      throw new OAuthError();
    }
  }

  /**
   * After OAuth identity is verified, decide whether to issue cookies and land
   * the user on the app, or redirect them to the 2FA second-step / setup page
   * with a short-lived challenge token in the URL.
   */
  private async finishOauth(userId: string, res: Response, next?: string) {
    const homepage = this.configService.get<string>('app.homepageUrl') || '';
    let result: Awaited<ReturnType<AuthService['issueTokensOrChallenge']>>;
    try {
      result = await this.auth.issueTokensOrChallenge(userId);
    } catch (error) {
      // Force-SSO: this account must sign in through SSO. Route the user to the
      // enforcing project's SSO entry (projectId travels in the error details)
      // instead of failing the social login with a generic OAuth error.
      if (error instanceof SsoRequiredError && typeof error.details?.projectId === 'string') {
        res.redirect(`${homepage}/auth/sso/${error.details.projectId}`);
        return;
      }
      throw error;
    }
    if (result.kind === 'tokens') {
      // Resume the interrupted flow (`next` from the OAuth state — e.g. the MCP
      // consent page) or land at SPA root and let LandingRedirect pick the env.
      this.auth
        .setAuthCookie(res, result.tokens)
        .redirect(next ? `${homepage}${next}` : homepage || '/');
      return;
    }
    const path = result.purpose === 'mfa-verify' ? '/auth/2fa' : '/auth/2fa/setup';
    // Forward `next` into the 2FA step: the web's useAuthAfterLogin reads it
    // off the page URL after verification and resumes the flow.
    const forwardNext = next ? `&next=${encodeURIComponent(next)}` : '';
    const url = `${homepage}${path}?challenge=${encodeURIComponent(result.challengeToken)}${forwardNext}`;
    res.redirect(url);
  }

  @Post('refresh')
  @Public()
  async refresh(@Req() req: Request, @Res() res: Response) {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

      if (!refreshToken) {
        throw new AuthenticationExpiredError();
      }

      const tokens = await this.auth.refreshAccessToken(refreshToken);
      this.auth.setAuthCookie(res, tokens);

      return res.json({ success: true });
    } catch (error) {
      this.logger.error('Token refresh failed:', error.stack);
      throw new AuthenticationExpiredError();
    }
  }
}
