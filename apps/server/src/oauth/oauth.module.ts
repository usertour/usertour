import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { OAuthController } from './oauth.controller';
import { OAuthDiscoveryController } from './oauth-discovery.controller';
import { OAuthGrantResolver } from './oauth-grant.resolver';
import { OAuthModelService } from './oauth-model.service';
import { OAuthService } from './oauth.service';

/**
 * OAuth 2.1 authorization server for the MCP endpoint (Phase 3). Discovery
 * metadata (3a) + DCR + authorize/consent + token/revoke. Access tokens are
 * issued into the existing `ApiToken` table (`uto_`), so the MCP guard is
 * unchanged. The JWT module signs the short-lived consent transaction.
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwt.secret'),
      }),
    }),
  ],
  controllers: [OAuthDiscoveryController, OAuthController],
  providers: [OAuthService, OAuthModelService, OAuthGrantResolver],
})
export class OAuthModule {}
