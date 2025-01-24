import {
  Resolver,
  Mutation,
  Args,
  Parent,
  ResolveField,
} from "@nestjs/graphql";
import { AuthService } from "./auth.service";
import { Auth } from "./models/auth.model";
import { Token } from "./models/token.model";
import { LoginInput } from "./dto/login.input";
import { SignupInput } from "./dto/signup.input";
import { RefreshTokenInput } from "./dto/refresh-token.input";
import { Public } from "@/common/decorators/public.decorator";
import { User } from "@/users/models/user.model";
import { Register } from "./models/register.model";
import { ResendLinkInput } from "./dto/resend-link.input";
import { MagicLinkInput } from "./dto/magic-link.input";
import { ResetPasswordInput } from "./dto/reset-password.input";
import { ResetPasswordByCodeInput } from "./dto/change-password.input";
import { Common } from "./models/common.model";

@Resolver(() => Auth)
export class AuthResolver {
  constructor(private readonly auth: AuthService) { }

  @Mutation(() => Register)
  @Public()
  createMagicLink(@Args("data") data: MagicLinkInput) {
    data.email = data.email.toLowerCase();
    return this.auth.createMagicLink(data.email);
  }

  @Mutation(() => Register)
  @Public()
  resendMagicLink(@Args("data") data: ResendLinkInput) {
    return this.auth.resendMargicLink(data.id);
  }

  @Mutation(() => Common)
  @Public()
  resetUserPassword(@Args("data") data: ResetPasswordInput) {
    data.email = data.email.toLowerCase();
    return this.auth.resetUserPassword(data.email);
  }

  @Mutation(() => Common)
  @Public()
  resetUserPasswordByCode(@Args("data") data: ResetPasswordByCodeInput) {
    return this.auth.resetUserPasswordByCode(
      data.code,
      data.password
    );
  }

  @Mutation(() => Auth)
  @Public()
  async signup(@Args("data") data: SignupInput) {
    const { accessToken, refreshToken } = await this.auth.signup(data);
    return {
      accessToken,
      refreshToken,
    };
  }

  @Mutation(() => Auth)
  @Public()
  async login(@Args("data") { email, password }: LoginInput) {
    const { accessToken, refreshToken } = await this.auth.login(
      email.toLowerCase(),
      password
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  @Mutation(() => Token)
  async refreshToken(@Args() { token }: RefreshTokenInput) {
    return this.auth.refreshToken(token);
  }

  @ResolveField("user", () => User)
  async user(@Parent() auth: Auth) {
    return await this.auth.getUserFromToken(auth.accessToken);
  }
}
