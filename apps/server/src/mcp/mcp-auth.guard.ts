import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

import { ApiTokenAuthService } from '@/api-token/api-token-auth.service';

/**
 * Authenticates the whole `/mcp` endpoint from the `Authorization: Bearer
 * utp_…` header and stashes the resolved token on `request.apiToken`. Unlike
 * the v2 {@link ApiTokenGuard}, there is no `:projectId` in the path here — the
 * project comes from the token, and per-tool capability checks happen later in
 * {@link McpService}. Throws the public OpenAPI auth errors on failure (so the
 * controller's exception filter serializes them like the v2 routes).
 */
@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(private readonly auth: ApiTokenAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { apiToken?: unknown }>();
    request.apiToken = await this.auth.authenticate(request.headers?.authorization);
    return true;
  }
}
