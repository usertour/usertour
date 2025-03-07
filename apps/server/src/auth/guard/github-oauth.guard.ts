import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OAuthError } from '@/common/errors/errors';

@Injectable()
export class GithubOauthGuard extends AuthGuard('github') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new OAuthError();
    }
    return user;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const { inviteCode } = request.query;

    if (inviteCode) {
      const state = Buffer.from(JSON.stringify({ inviteCode })).toString('base64');
      return {
        state,
      };
    }
    return {};
  }
}
