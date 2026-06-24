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
  async githubAuthCallback(@UserEntity() user: User, @Res() res: Response) {
    try {
      this.logger.log(`github oauth callback success, req.user = ${user?.email}`);
      await this.finishOauth(user.id, res);
    } catch (error) {
      this.logger.error('GitHub OAuth callback failed:', error.stack);
      throw new OAuthError();
    }
  }

  @UseGuards(GoogleOauthGuard)
  @Get('google/callback')
  @Public()
  async googleAuthCallback(@UserEntity() user: User, @Res() res: Response) {
    try {
      this.logger.log(`google oauth callback success, req.user = ${user?.email}`);
      await this.finishOauth(user.id, res);
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
  private async finishOauth(userId: string, res: Response) {
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
      // Land at SPA root and let LandingRedirect pick the user's env.
      this.auth.setAuthCookie(res, result.tokens).redirect(homepage || '/');
      return;
    }
    const path = result.purpose === 'mfa-verify' ? '/auth/2fa' : '/auth/2fa/setup';
    const url = `${homepage}${path}?challenge=${encodeURIComponent(result.challengeToken)}`;
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
