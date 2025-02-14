import { UnauthorizedException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOauthGuard extends AuthGuard('google') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
