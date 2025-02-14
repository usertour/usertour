import { Public } from '@/common/decorators/public.decorator';
import { User } from '@/users/models/user.model';
import { Args, Mutation, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { ResetPasswordByCodeInput } from './dto/change-password.input';
import { LoginInput } from './dto/login.input';
import { MagicLinkInput } from './dto/magic-link.input';
import { RefreshTokenInput } from './dto/refresh-token.input';
import { ResendLinkInput } from './dto/resend-link.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { SignupInput } from './dto/signup.input';
import { Auth } from './models/auth.model';
import { Common } from './models/common.model';
import { Register } from './models/register.model';
import { Token } from './models/token.model';
import { UseGuards } from '@nestjs/common';
import { GithubOauthGuard } from './guard/github-oauth.guard';
import { GoogleOauthGuard } from './guard/google-oauth.guard';

@Resolver(() => Auth)
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @UseGuards(GithubOauthGuard)
  @Public()
  async github() {
    // auth guard will automatically handle this
  }

  @UseGuards(GoogleOauthGuard)
  @Public()
  async google() {
    // auth guard will automatically handle this
  }

  @UseGuards(GithubOauthGuard)
  @Public()
  async githubAuthCallback() {}

  @UseGuards(GoogleOauthGuard)
  @Public()
  async googleAuthCallback() {}

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
  async signup(@Args('data') data: SignupInput) {
    const { accessToken, refreshToken } = await this.auth.signup(data);
    return {
      accessToken,
      refreshToken,
    };
  }

  @Mutation(() => Auth)
  @Public()
  async login(@Args('data') { email, password }: LoginInput) {
    const { accessToken, refreshToken } = await this.auth.login(email.toLowerCase(), password);

    return {
      accessToken,
      refreshToken,
    };
  }

  @Mutation(() => Token)
  async refreshToken(@Args() { token }: RefreshTokenInput) {
    return this.auth.refreshToken(token);
  }

  @ResolveField('user', () => User)
  async user(@Parent() auth: Auth) {
    return await this.auth.getUserFromToken(auth.accessToken);
  }
}
