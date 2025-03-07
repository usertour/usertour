import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

import { AuthService } from '../auth.service';
import { OAuthError } from '@/common/errors/errors';

@Injectable()
export class GoogleOauthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get('auth.google.clientId'),
      clientSecret: configService.get('auth.google.clientSecret'),
      callbackURL: configService.get('auth.google.callbackUrl'),
      scope: ['profile', 'email'],
      passReqToCallback: true,
    });
  }

  async validate(req: any, accessToken: string, refreshToken: string, profile: Profile) {
    let inviteCode: string | undefined;
    if (req.query.state) {
      try {
        const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
        inviteCode = stateData.inviteCode;
        console.log('google oauth validate inviteCode', inviteCode);
      } catch (_) {
        throw new OAuthError();
      }
    }

    return this.authService.oauthValidate(accessToken, refreshToken, profile, inviteCode);
  }
}
