import { createHash } from 'node:crypto';

import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { RateLimitExceededError } from '@/common/errors/errors';

/**
 * Rate limiting for the v2 REST surface. Registered as a global guard by
 * ApiModule but a no-op for anything that is not an HTTP /v2 request —
 * GraphQL, v1 and the websocket gateway keep their own behavior (the gateway
 * has its own WebSocketThrottlerGuard).
 *
 * Keyed per CREDENTIAL: the bearer string is hashed into the bucket key (no
 * signature check needed — the raw string is a stable identifier), so one
 * tenant hammering the API cannot starve others behind the same NAT; requests
 * without a bearer fall back to the client IP. Limits come from
 * API_THROTTLE_LIMIT / API_THROTTLE_TTL (default 1000 requests / 60s — the
 * intent of the long-commented-out express-rate-limit middleware in main.ts).
 *
 * On breach it throws RateLimitExceededError (E1013, 429) so the documented
 * v2 error envelope applies — errors.mdx promised this code long before any
 * limiter existed (console sweep, endpoint 5 follow-up).
 */
@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }
    const req = context.switchToHttp().getRequest<{ path?: string }>();
    if (!req?.path?.startsWith('/v2')) {
      return true;
    }
    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const auth = (req.headers as Record<string, string> | undefined)?.authorization;
    if (auth?.startsWith('Bearer ')) {
      return `api:${createHash('sha256').update(auth.slice(7)).digest('hex').slice(0, 32)}`;
    }
    const ip =
      (req.ips as string[] | undefined)?.[0] ?? (req.ip as string | undefined) ?? 'unknown';
    return `api:ip:${ip}`;
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new RateLimitExceededError();
  }
}
