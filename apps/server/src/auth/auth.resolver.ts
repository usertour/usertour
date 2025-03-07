import { Public } from '@/common/decorators/public.decorator';
import { User } from '@/users/models/user.model';
import { Args, Mutation, Parent, ResolveField, Resolver, Context, Query } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { ResetPasswordByCodeInput } from './dto/change-password.input';
import { LoginInput } from './dto/login.input';
import { MagicLinkInput } from './dto/magic-link.input';
import { ResendLinkInput } from './dto/resend-link.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { SignupInput } from './dto/signup.input';
import { Auth, AuthConfigItem } from './models/auth.model';
import { Common } from './models/common.model';
import { Register } from './models/register.model';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { UserEntity } from '@/common/decorators/user.decorator';

@Resolver(() => Auth)
export class AuthResolver {
  private readonly logger = new Logger(AuthResolver.name);
  constructor(
    private readonly auth: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Mutation(() => Register)
  @Public()
  createMagicLink(@Args('data') data: MagicLinkInput) {
    data.email = data.email.toLowerCase();
    return this.auth.createMagicLink(data.email);
  }

  @Mutation(() => Register)
  @Public()
  resendMagicLink(@Args('data') data: ResendLinkInput) {
    return this.auth.resendMargicLink(data.id);
  }

  @Mutation(() => Common)
  @Public()
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
  async signup(@Args('data') data: SignupInput, @Context() context: { res: Response }) {
    const tokens = await this.auth.signup(data);
    this.auth.setAuthCookie(context.res, tokens);

    return {
      ...tokens,
      redirectUrl: this.configService.get('auth.redirectUrl'),
    };
  }

  @Mutation(() => Auth)
  @Public()
  async login(
    @Args('data') { email, password, inviteCode }: LoginInput,
    @Context() context: { res: Response },
  ) {
    const tokens = await this.auth.emailLogin(email.toLowerCase(), password, inviteCode);
    this.logger.log(`Login successful for email: ${email}`);

    this.auth.setAuthCookie(context.res, tokens);

    return {
      ...tokens,
      redirectUrl: this.configService.get('auth.redirectUrl'),
    };
  }

  @Query(() => [AuthConfigItem])
  @Public()
  async getAuthConfig() {
    return this.auth.getAuthConfig();
  }

  @Mutation(() => Boolean)
  async logout(@UserEntity() user: User, @Context() context: { res: Response }) {
    this.logger.log(`Logging out user: ${user.id}`);
    await this.auth.revokeAllRefreshTokens(user.id);
    this.auth.clearAuthCookie(context.res);
    this.logger.log(`Successfully logged out user: ${user.id}`);
    return true;
  }

  @ResolveField('user', () => User)
  async user(@Parent() auth: Auth) {
    return await this.auth.getUserFromToken(auth.accessToken);
  }
}
