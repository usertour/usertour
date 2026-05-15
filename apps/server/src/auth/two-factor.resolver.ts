import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { PrismaService } from 'nestjs-prisma';
import { Public } from '@/common/decorators/public.decorator';
import { UserEntity } from '@/common/decorators/user.decorator';
import { InvalidTwoFactorChallengeError } from '@/common/errors';
import { User } from '@/users/models/user.model';
import { AuthService } from './auth.service';
import {
  ConfirmTwoFactorSetupInput,
  TwoFactorStepUpInput,
  VerifyTwoFactorInput,
} from './dto/two-factor.input';
import { Auth } from './models/auth.model';
import { TwoFactorEnableResult, TwoFactorSetupPayload } from './models/two-factor.model';
import { TwoFactorService } from './two-factor.service';

@Resolver()
export class TwoFactorResolver {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // -- Logged-in path: user enables 2FA from settings ------------------------

  @Mutation(() => TwoFactorSetupPayload)
  async startTwoFactorSetup(@UserEntity() user: User): Promise<TwoFactorSetupPayload> {
    return this.twoFactorService.startSetup(user);
  }

  @Mutation(() => TwoFactorEnableResult)
  async confirmTwoFactorSetup(
    @Args('data') data: ConfirmTwoFactorSetupInput,
    @UserEntity() user: User,
    @Context() context: { res: Response },
  ): Promise<TwoFactorEnableResult> {
    const { recoveryCodes } = await this.twoFactorService.confirmSetup(
      user,
      data.secret,
      data.code,
    );
    // confirmSetup revokes every refresh token on this user — including the
    // one backing the caller's current session. Issue a fresh access/refresh
    // pair and set cookies so the user stays logged in once the existing
    // access token's 15-minute window expires. Without this, the user is
    // silently logged out the next time the SPA tries to refresh.
    const tokens = await this.authService.login(user.id);
    this.authService.setAuthCookie(context.res, tokens);
    return {
      recoveryCodes,
      auth: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        redirectUrl: this.configService.get('auth.redirectUrl'),
        requiresTwoFactor: false,
        requiresTwoFactorSetup: false,
      },
    };
  }

  // -- Strict enforcement path: client holds an `mfa-setup-required` challenge

  @Mutation(() => TwoFactorSetupPayload)
  @Public()
  async startTwoFactorSetupWithChallenge(
    @Args('challengeToken') challengeToken: string,
  ): Promise<TwoFactorSetupPayload> {
    return this.twoFactorService.startSetupViaChallenge(challengeToken);
  }

  @Mutation(() => TwoFactorEnableResult)
  @Public()
  async confirmTwoFactorSetupWithChallenge(
    @Args('data') data: ConfirmTwoFactorSetupInput,
    @Context() context: { res: Response },
  ): Promise<TwoFactorEnableResult> {
    if (!data.challengeToken) {
      throw new InvalidTwoFactorChallengeError();
    }
    const { user: enrolledUser, recoveryCodes } =
      await this.twoFactorService.confirmSetupViaChallenge(
        data.challengeToken,
        data.secret,
        data.code,
      );
    const tokens = await this.authService.login(enrolledUser.id);
    this.authService.setAuthCookie(context.res, tokens);
    return {
      recoveryCodes,
      auth: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        redirectUrl: this.configService.get('auth.redirectUrl'),
        requiresTwoFactor: false,
        requiresTwoFactorSetup: false,
      },
    };
  }

  // -- Login second step ----------------------------------------------------

  @Mutation(() => Auth)
  @Public()
  async verifyTwoFactor(
    @Args('data') data: VerifyTwoFactorInput,
    @Context() context: { res: Response },
  ): Promise<Auth> {
    const user = await this.twoFactorService.verifyChallenge(
      data.challengeToken,
      data.code,
      data.isRecoveryCode,
    );
    const tokens = await this.authService.login(user.id);
    this.authService.setAuthCookie(context.res, tokens);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      redirectUrl: this.configService.get('auth.redirectUrl'),
      requiresTwoFactor: false,
      requiresTwoFactorSetup: false,
    };
  }

  // -- Step-up: disable / regenerate ----------------------------------------

  @Mutation(() => Boolean)
  async disableTwoFactor(
    @Args('data') data: TwoFactorStepUpInput,
    @UserEntity() user: User,
  ): Promise<boolean> {
    const fullUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!fullUser) {
      throw new InvalidTwoFactorChallengeError();
    }
    await this.twoFactorService.disable(fullUser, data.code, data.isRecoveryCode);
    return true;
  }

  @Mutation(() => TwoFactorEnableResult)
  async regenerateRecoveryCodes(
    @Args('data') data: TwoFactorStepUpInput,
    @UserEntity() user: User,
  ): Promise<TwoFactorEnableResult> {
    const fullUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!fullUser) {
      throw new InvalidTwoFactorChallengeError();
    }
    const { recoveryCodes } = await this.twoFactorService.regenerateRecoveryCodes(
      fullUser,
      data.code,
      data.isRecoveryCode,
    );
    return { recoveryCodes };
  }
}
