import { UnauthorizedException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOauthGuard extends AuthGuard('google') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      console.log('err', err);
      console.log('user', user);
      throw new UnauthorizedException();
    }
    return user;
  }
}
