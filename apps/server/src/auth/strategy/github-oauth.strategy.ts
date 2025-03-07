import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';

import { AuthService } from '../auth.service';
import { OAuthError } from '@/common/errors/errors';

@Injectable()
export class GithubOauthStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get('auth.github.clientId'),
      clientSecret: configService.get('auth.github.clientSecret'),
      callbackURL: configService.get('auth.github.callbackUrl'),
      scope: ['read:user', 'user:email'],
      passReqToCallback: true,
    });
  }

  async validate(req: any, accessToken: string, refreshToken: string, profile: Profile) {
    let inviteCode: string | undefined;
    if (req.query.state) {
      try {
        const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
        inviteCode = stateData.inviteCode;
        console.log('github oauth validate inviteCode', inviteCode);
      } catch (_) {
        throw new OAuthError();
      }
    }

    return this.authService.oauthValidate(accessToken, refreshToken, profile, inviteCode);
  }
}
