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
    const { inviteCode, next } = request.query;

    // `next` rides the OAuth state round-trip like inviteCode, so a login that
    // interrupted another flow (the MCP OAuth consent page) can resume it.
    // Only same-origin path shapes are carried; the callback re-validates
    // before redirecting (state is client-controlled input).
    const payload: Record<string, string> = {};
    if (typeof inviteCode === 'string' && inviteCode) {
      payload.inviteCode = inviteCode;
    }
    if (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')) {
      payload.next = next;
    }
    if (Object.keys(payload).length > 0) {
      return { state: Buffer.from(JSON.stringify(payload)).toString('base64') };
    }
    return {};
  }
}
