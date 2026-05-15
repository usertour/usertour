import { Public } from '@/common/decorators/public.decorator';
import { User } from '@/users/models/user.model';
import { Args, Mutation, Parent, ResolveField, Resolver, Context } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthResult } from './dto/auth.dto';
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
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { UserEntity } from '@/common/decorators/user.decorator';
import { EmailConfigGuard } from '@/common/guards/email-config.guard';

@Resolver(() => Auth)
export class AuthResolver {
  private readonly logger = new Logger(AuthResolver.name);
  constructor(
    private readonly auth: AuthService,
    private readonly configService: ConfigService,
  ) {}

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
  async login(
    @Args('data') { email, password, inviteCode }: LoginInput,
    @Context() context: { res: Response },
  ) {
    const result = await this.auth.emailLogin(email.toLowerCase(), password, inviteCode);
    this.logger.log(`Login attempt resolved for email: ${email} (${result.kind})`);
    return this.formatAuthResult(result, context.res);
  }

  @Mutation(() => Boolean)
  async logout(@UserEntity() user: User, @Context() context: { res: Response }) {
    this.logger.log(`Logging out user: ${user.id}`);
    await this.auth.revokeAllRefreshTokens(user.id);
    this.auth.clearAuthCookie(context.res);
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
        redirectUrl: this.configService.get('auth.redirectUrl'),
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
