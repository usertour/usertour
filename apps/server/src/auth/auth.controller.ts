import { Controller, Get, UseGuards, Res, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { GithubOauthGuard } from './guard/github-oauth.guard';
import { GoogleOauthGuard } from './guard/google-oauth.guard';
import { Public } from '../common/decorators/public.decorator';
import { UserEntity } from '../common/decorators/user.decorator';
import { Response } from 'express';
import { Logger } from '@nestjs/common';
import { User } from '@/users/models/user.model';

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

      const tokens = await this.auth.login(user.id);
      this.auth.setAuthCookie(res, tokens).redirect(this.configService.get('auth.redirectUrl'));
    } catch (error) {
      this.logger.error('GitHub OAuth callback failed:', error.stack);
      throw new BadRequestException('GitHub OAuth callback failed');
    }
  }

  @UseGuards(GoogleOauthGuard)
  @Get('google/callback')
  @Public()
  async googleAuthCallback(@UserEntity() user: User, @Res() res: Response) {
    try {
      this.logger.log(`google oauth callback success, req.user = ${user?.email}`);

      const tokens = await this.auth.login(user.id);
      this.auth.setAuthCookie(res, tokens).redirect(this.configService.get('auth.redirectUrl'));
    } catch (error) {
      this.logger.error('Google OAuth callback failed:', error.stack);
      throw new BadRequestException('Google OAuth callback failed');
    }
  }
}
