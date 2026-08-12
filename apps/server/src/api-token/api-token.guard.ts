import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { InvalidApiKeyError } from '@/common/errors';

import { ApiTokenAuthService } from './api-token-auth.service';
import { RequireCapability } from './require-capability.decorator';

/**
 * Authorizes a request bearing an ApiToken (`utp_…`) against a project-rooted
 * v2 route: authenticate the token → resolve `:projectId` from the path →
 * assert project∈scope + live role + (if declared) the `@RequireCapability` ∈
 * ROLE_CAPABILITIES[role] ∩ token.scopes → for env-rooted routes, resolve
 * `:environmentId` and assert it belongs to the project. Attaches
 * `request.environment` / `request.apiToken` / `request.projectId`. The shared
 * rule lives in {@link ApiTokenAuthService} so the MCP endpoint can reuse it.
 */
@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(
    private readonly auth: ApiTokenAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token = await this.auth.authenticate(request.headers?.authorization);

    // v2 routes are project-rooted; project is always in the path.
    const projectId = request.params?.projectId as string | undefined;
    if (!projectId) {
      throw new InvalidApiKeyError();
    }

    const required = this.reflector.get(RequireCapability, context.getHandler());
    await this.auth.authorize(token, projectId, required);

    const environmentId = request.params?.environmentId as string | undefined;
    if (environmentId) {
      request.environment = await this.auth.resolveEnvironment(projectId, environmentId);
      // Third dimension: the token must be scoped to this environment (read or write).
      this.auth.assertEnvironmentInScope(token, request.environment);
    }

    request.apiToken = token;
    request.projectId = projectId;

    return true;
  }
}
