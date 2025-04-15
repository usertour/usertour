import { GqlAuthGuard } from '@/auth/guard/gql-auth.guard';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PasswordService } from './password.service';
import { AuthController } from './auth.controller';
import { GithubOauthStrategy } from './strategy/github-oauth.strategy';
import { GoogleOauthStrategy } from './strategy/google-oauth.strategy';
import { TeamModule } from '@/team/team.module';
import { BullModule } from '@nestjs/bullmq';
import {
  QUEUE_INITIALIZE_PROJECT,
  QUEUE_SEND_MAGIC_LINK_EMAIL,
  QUEUE_SEND_RESET_PASSWORD_EMAIL,
} from '@/common/consts/queen';
import {
  InitializeProjectProcessor,
  SendMagicLinkEmailProcessor,
  SendResetPasswordEmailProcessor,
} from './auth.processor';
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
    BullModule.registerQueue({ name: QUEUE_INITIALIZE_PROJECT }),
    TeamModule,
    (StripeModule as any).externallyConfigured(StripeModule, 0),
  ],
  providers: [
    AuthService,
    AuthResolver,
    JwtStrategy,
    GqlAuthGuard,
    PasswordService,
    GithubOauthStrategy,
    GoogleOauthStrategy,
    SendMagicLinkEmailProcessor,
    SendResetPasswordEmailProcessor,
    InitializeProjectProcessor,
    {
      provide: APP_GUARD,
      useClass: GqlAuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
