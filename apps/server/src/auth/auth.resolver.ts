import { Public } from '@/common/decorators/public.decorator';
import { User } from '@/users/models/user.model';
import { Args, Mutation, Parent, ResolveField, Resolver, Context } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthResult } from './dto/auth.dto';
import { AcceptInviteInput } from './dto/accept-invite.input';
import { ResetPasswordByCodeInput } from './dto/change-password.input';
import { LoginInput } from './dto/login.input';
import { MagicLinkInput } from './dto/magic-link.input';
import { ResendLinkInput } from './dto/resend-link.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { SetupSystemAdminInput } from './dto/setup-system-admin.input';
import { SignupInput } from './dto/signup.input';
import { Auth } from './models/auth.model';
import { Common } from './models/common.model';
import { Register } from './models/register.model';
import { Logger, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { REFRESH_TOKEN_COOKIE } from '@/utils/cookie';
import { UserEntity } from '@/common/decorators/user.decorator';
import { SkipTwoFactorEnrollment } from '@/common/decorators/skip-2fa-enrollment.decorator';
import { EmailConfigGuard } from '@/common/guards/email-config.guard';

@Resolver(() => Auth)
export class AuthResolver {
  private readonly logger = new Logger(AuthResolver.name);
  constructor(private readonly auth: AuthService) {}

  @Mutation(() => Register)
  @Public()
  @UseGuards(EmailConfigGuard)
  createMagicLink(@Args('data') data: MagicLinkInput) {
    data.email = data.email.toLowerCase();
    return this.auth.createMagicLink(data.email);
  }

  @Mutation(() => Register)
  @Public()
  @UseGuards(EmailConfigGuard)
  resendMagicLink(@Args('data') data: ResendLinkInput) {
    return this.auth.resendMargicLink(data.id);
  }

  @Mutation(() => Common)
  @Public()
  @UseGuards(EmailConfigGuard)
  resetUserPassword(@Args('data') data: ResetPasswordInput) {
    data.email = data.email.toLowerCase();
    return this.auth.resetUserPassword(data.email);
  }

  @Mutation(() => Common)
  @Public()
  resetUserPasswordByCode(@Args('data') data: ResetPasswordByCodeInput) {
    return this.auth.resetUserPasswordByCode(data.code, data.password);
  }

  @Mutation(() => Auth)
  @Public()
  async setupSystemAdmin(
    @Args('data') data: SetupSystemAdminInput,
    @Context() context: { res: Response },
  ) {
    const result = await this.auth.setupSystemAdmin(
      data.name,
      data.email.toLowerCase(),
      data.password,
    );
    return this.formatAuthResult(result, context.res);
  }

  @Mutation(() => Auth)
  @Public()
  async signup(@Args('data') data: SignupInput, @Context() context: { res: Response }) {
    const result = await this.auth.signup(data);
    return this.formatAuthResult(result, context.res);
  }

  @Mutation(() => Auth)
  @Public()
  async acceptInvite(@Args('data') data: AcceptInviteInput, @Context() context: { res: Response }) {
    const result = await this.auth.acceptInvite(data);
    return this.formatAuthResult(result, context.res);
  }

  @Mutation(() => Auth)
  @Public()
  async login(
    @Args('data') { email, password, inviteCode }: LoginInput,
    @Context() context: { res: Response },
  ) {
    const result = await this.auth.emailLogin(email.toLowerCase(), password, inviteCode);
    this.logger.log(`Login attempt resolved for email: ${email} (${result.kind})`);
    return this.formatAuthResult(result, context.res);
  }

  @Mutation(() => Boolean)
  @SkipTwoFactorEnrollment()
  async logout(@UserEntity() user: User, @Context() context: { req: Request; res: Response }) {
    this.logger.log(`Logging out user: ${user.id}`);
    // Clear cookies first — it only writes response headers and can't fail, so
    // logout stays effective even if the revoke below hits a DB error.
    this.auth.clearAuthCookie(context.res);
    // Revoke only THIS session's refresh token (per-device logout), not every
    // session the user has. Best-effort: a failure here must not fail logout.
    const refreshToken = context.req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (refreshToken) {
      try {
        await this.auth.revokeRefreshToken(refreshToken);
      } catch (error) {
        this.logger.error(`Failed to revoke refresh token on logout for ${user.id}`, error);
      }
    }
    this.logger.log(`Successfully logged out user: ${user.id}`);
    return true;
  }

  @ResolveField('user', () => User, { nullable: true })
  async user(@Parent() auth: Auth) {
    if (!auth.accessToken) {
      return null;
    }
    return await this.auth.getUserFromToken(auth.accessToken);
  }

  private formatAuthResult(result: AuthResult, res: Response): Auth {
    if (result.kind === 'tokens') {
      this.auth.setAuthCookie(res, result.tokens);
      return {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        requiresTwoFactor: false,
        requiresTwoFactorSetup: false,
      };
    }
    return {
      requiresTwoFactor: result.purpose === 'mfa-verify',
      requiresTwoFactorSetup: result.purpose === 'mfa-setup-required',
      twoFactorChallenge: result.challengeToken,
    };
  }
}
