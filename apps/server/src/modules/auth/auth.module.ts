import { GqlAuthGuard } from '@/modules/auth/guards/gql-auth.guard';
import { TwoFactorEnrollmentGuard } from '@/modules/auth/guards/two-factor-enrollment.guard';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthResolver } from './resolvers/auth.resolver';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PasswordService } from './services/password.service';
import { AuthController } from './controllers/auth.controller';
import { GithubOauthStrategy } from './strategies/github-oauth.strategy';
import { GoogleOauthStrategy } from './strategies/google-oauth.strategy';
import { TwoFactorService } from './services/two-factor.service';
import { TwoFactorResolver } from './resolvers/two-factor.resolver';
import { TeamModule } from '@/modules/team/team.module';
import { SharedModule } from '@/shared/shared.module';
import { LicenseModule } from '@/modules/license/license.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { BullModule } from '@nestjs/bullmq';
import {
  QUEUE_CLEAN_EXPIRED_REFRESH_TOKENS,
  QUEUE_SEND_MAGIC_LINK_EMAIL,
  QUEUE_SEND_RESET_PASSWORD_EMAIL,
} from './constants/auth-queues.constant';
import {
  CleanExpiredRefreshTokensProcessor,
  SendMagicLinkEmailProcessor,
  SendResetPasswordEmailProcessor,
} from './processors/auth.processor';
import { StripeModule } from '@golevelup/nestjs-stripe';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => {
        return {
          secret: configService.get('auth.jwt.secret'),
          signOptions: {
            expiresIn: configService.get('auth.jwt.expiresIn'),
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: QUEUE_SEND_MAGIC_LINK_EMAIL }),
    BullModule.registerQueue({ name: QUEUE_SEND_RESET_PASSWORD_EMAIL }),
    BullModule.registerQueue({ name: QUEUE_CLEAN_EXPIRED_REFRESH_TOKENS, prefix: 'auth_cron' }),
    TeamModule,
    SharedModule,
    LicenseModule,
    ProjectsModule,
    (StripeModule as any).externallyConfigured(StripeModule, 0),
  ],
  providers: [
    AuthService,
    AuthResolver,
    TwoFactorService,
    TwoFactorResolver,
    JwtStrategy,
    GqlAuthGuard,
    PasswordService,
    GithubOauthStrategy,
    GoogleOauthStrategy,
    SendMagicLinkEmailProcessor,
    SendResetPasswordEmailProcessor,
    CleanExpiredRefreshTokensProcessor,
    {
      provide: APP_GUARD,
      useClass: GqlAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TwoFactorEnrollmentGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, TwoFactorService, PasswordService, JwtModule],
})
export class AuthModule {}
