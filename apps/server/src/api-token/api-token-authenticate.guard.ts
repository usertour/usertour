import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { ApiTokenAuthService } from './api-token-auth.service';

/**
 * Authenticate-only guard for the few v2 routes that carry NO project in the
 * path (discovery endpoints like `GET /v2/me`): resolve the bearer ApiToken
 * and attach it, nothing more. Project/capability/environment authorization
 * stays with {@link ApiTokenGuard} on the project-rooted routes — a route
 * behind THIS guard must never mutate or read project-scoped data beyond
 * what the token row itself grants visibility into.
 */
@Injectable()
export class ApiTokenAuthenticateGuard implements CanActivate {
  constructor(private readonly auth: ApiTokenAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    request.apiToken = await this.auth.authenticate(request.headers?.authorization);
    return true;
  }
}
