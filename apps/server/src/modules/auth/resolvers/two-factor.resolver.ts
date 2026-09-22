import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { Response } from 'express';
import { PrismaService } from 'nestjs-prisma';
import { Public } from '@/common/decorators/public.decorator';
import { SkipTwoFactorEnrollment } from '@/common/decorators/skip-2fa-enrollment.decorator';
import { UserEntity } from '@/common/decorators/user.decorator';
import { InvalidTwoFactorChallengeError } from '@/common/errors';
import { UserDTO } from '@/modules/users/dtos/user.dto';
import { AuthService } from '../services/auth.service';
import { ConfirmTwoFactorSetupInput } from '../dtos/confirm-two-factor-setup.input';
import { TwoFactorStepUpInput } from '../dtos/two-factor-step-up.input';
import { VerifyTwoFactorInput } from '../dtos/verify-two-factor.input';
import { AuthDTO } from '../dtos/auth.dto';
import { TwoFactorEnableResultDTO } from '../dtos/two-factor-enable-result.dto';
import { TwoFactorSetupPayloadDTO } from '../dtos/two-factor-setup-payload.dto';
import { TwoFactorService } from '../services/two-factor.service';

@Resolver()
export class TwoFactorResolver {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  // -- Logged-in path: user enables 2FA from settings ------------------------

  @Mutation(() => TwoFactorSetupPayloadDTO)
  @SkipTwoFactorEnrollment()
  async startTwoFactorSetup(@UserEntity() user: UserDTO): Promise<TwoFactorSetupPayloadDTO> {
    return this.twoFactorService.startSetup(user);
  }

  @Mutation(() => TwoFactorEnableResultDTO)
  @SkipTwoFactorEnrollment()
  async confirmTwoFactorSetup(
    @Args('data') data: ConfirmTwoFactorSetupInput,
    @UserEntity() user: UserDTO,
    @Context() context: { res: Response },
  ): Promise<TwoFactorEnableResultDTO> {
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
        requiresTwoFactor: false,
        requiresTwoFactorSetup: false,
      },
    };
  }

  // -- Strict enforcement path: client holds an `mfa-setup-required` challenge

  @Mutation(() => TwoFactorSetupPayloadDTO)
  @Public()
  async startTwoFactorSetupWithChallenge(
    @Args('challengeToken') challengeToken: string,
  ): Promise<TwoFactorSetupPayloadDTO> {
    return this.twoFactorService.startSetupViaChallenge(challengeToken);
  }

  @Mutation(() => TwoFactorEnableResultDTO)
  @Public()
  async confirmTwoFactorSetupWithChallenge(
    @Args('data') data: ConfirmTwoFactorSetupInput,
    @Context() context: { res: Response },
  ): Promise<TwoFactorEnableResultDTO> {
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
        requiresTwoFactor: false,
        requiresTwoFactorSetup: false,
      },
    };
  }

  // -- Login second step ----------------------------------------------------

  @Mutation(() => AuthDTO)
  @Public()
  async verifyTwoFactor(
    @Args('data') data: VerifyTwoFactorInput,
    @Context() context: { res: Response },
  ): Promise<AuthDTO> {
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
      requiresTwoFactor: false,
      requiresTwoFactorSetup: false,
    };
  }

  // -- Step-up: disable / regenerate ----------------------------------------

  @Mutation(() => Boolean)
  async disableTwoFactor(
    @Args('data') data: TwoFactorStepUpInput,
    @UserEntity() user: UserDTO,
  ): Promise<boolean> {
    const fullUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!fullUser) {
      throw new InvalidTwoFactorChallengeError();
    }
    await this.twoFactorService.disable(fullUser, data.code, data.isRecoveryCode);
    return true;
  }

  @Mutation(() => TwoFactorEnableResultDTO)
  async regenerateRecoveryCodes(
    @Args('data') data: TwoFactorStepUpInput,
    @UserEntity() user: UserDTO,
  ): Promise<TwoFactorEnableResultDTO> {
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
