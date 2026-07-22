import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { resolvePlanFeatures } from '@usertour/helpers';
import { PlanType } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { hashApiTokenSecret, stripTokenPrefix } from '@/api-token/api-token.crypto';
import { RateLimitExceededError } from '@/common/errors/errors';

interface ResolvedThrottle {
  tracker: string;
  limit: number;
}

/**
 * Rate limiting for the v2 REST surface. Registered as a global guard by
 * ApiModule but a no-op for anything that is not an HTTP /v2 request —
 * GraphQL, v1 and the websocket gateway keep their own behavior.
 *
 * The limit is the PLAN's promise: the pricing page renders "N API
 * requests/min" from PLAN_FEATURES.apiRateLimit (100/500/1000/3000), and this
 * guard enforces the same matrix — a valid credential gets its project's plan
 * allowance in its own bucket (keyed by token id, so one tenant can never
 * starve another). Requests with no/unknown credentials share a per-IP bucket
 * at API_THROTTLE_FALLBACK_LIMIT (default 100): rotating garbage bearer
 * strings therefore does NOT open fresh buckets. Self-hosted deployments have
 * no plans — they get a flat API_THROTTLE_LIMIT (default 1000).
 *
 * On breach it throws RateLimitExceededError (E1013, 429 — the code
 * errors.mdx promised long before any limiter existed) and sets the STANDARD
 * `Retry-After` header, which off-the-shelf retry middleware understands
 * (the throttler's own name-suffixed header is useless to them).
 */
@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  @Inject(ConfigService)
  private readonly config!: ConfigService;

  /** Valid-credential cache: hashedSecret -> resolved bucket, 60s. */
  private readonly credentialCache = new Map<string, ResolvedThrottle & { expiresAt: number }>();
  private static readonly CACHE_TTL_MS = 60_000;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }
    const req = context.switchToHttp().getRequest<Record<string, any>>();
    if (!req?.path?.startsWith('/v2')) {
      return true;
    }
    // Resolve tracker + plan limit ONCE per request and stash it for the
    // getTracker/handleRequest hooks below.
    req.__apiThrottle = await this.resolveThrottle(req);
    return super.canActivate(context);
  }

  /**
   * Full override (no super call): swaps the static module limit for the
   * credential's plan allowance AND owns the response headers. The library's
   * own headers are name-suffixed (X-RateLimit-Limit-Api, Retry-After-Api) —
   * shapes no client or retry middleware recognizes — so they are disabled in
   * the module config (setHeaders: false) and the STANDARD ones are set here:
   *
   *  - every /v2 response carries X-RateLimit-Limit / -Remaining / -Reset, so
   *    integrators can pace themselves BEFORE hitting the wall (and can see
   *    the allowance their plan actually grants);
   *  - a breach carries RFC 9110 `Retry-After` and the E1013 envelope.
   */
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, ttl, throttler, blockDuration, generateKey } = requestProps;
    const http = context.switchToHttp();
    const req = http.getRequest<Record<string, any>>();
    const res = http.getResponse();
    const resolved = req.__apiThrottle as ResolvedThrottle | undefined;
    const limit = resolved?.limit ?? requestProps.limit;
    const tracker = resolved?.tracker ?? (await this.getTracker(req));
    const name = throttler.name ?? 'api';
    const key = generateKey(context, tracker, name);

    const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } =
      await this.storageService.increment(key, ttl, limit, blockDuration, name);

    const resetSeconds = Math.max(1, Math.ceil(timeToExpire / 1000));
    res.header('X-RateLimit-Limit', String(limit));
    res.header('X-RateLimit-Remaining', String(Math.max(0, limit - totalHits)));
    res.header('X-RateLimit-Reset', String(resetSeconds));

    if (isBlocked || totalHits > limit) {
      const retryAfter = isBlocked
        ? Math.max(1, Math.ceil(timeToBlockExpire / 1000))
        : resetSeconds;
      res.header('Retry-After', String(retryAfter));
      throw new RateLimitExceededError();
    }
    return true;
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const resolved = (req as { __apiThrottle?: ResolvedThrottle }).__apiThrottle;
    if (resolved) {
      return resolved.tracker;
    }
    const ip =
      (req.ips as string[] | undefined)?.[0] ?? (req.ip as string | undefined) ?? 'unknown';
    return `api:ip:${ip}`;
  }

  // ── bucket + limit resolution ───────────────────────────────────────

  private async resolveThrottle(req: Record<string, any>): Promise<ResolvedThrottle> {
    const ip = (req.ips as string[])?.[0] ?? (req.ip as string) ?? 'unknown';
    const fallback: ResolvedThrottle = {
      tracker: `api:ip:${ip}`,
      limit: this.config.get<number>('API_THROTTLE_FALLBACK_LIMIT', 100),
    };

    const auth = (req.headers as Record<string, string> | undefined)?.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return fallback;
    }
    const secret = stripTokenPrefix(auth.slice(7));
    if (secret === null) {
      return fallback; // malformed bearer — shares the IP bucket
    }

    const hashed = hashApiTokenSecret(secret);
    const cached = this.credentialCache.get(hashed);
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    const token = await this.prisma.apiToken.findUnique({
      where: { hashedSecret: hashed },
      select: {
        id: true,
        isActive: true,
        expiresAt: true,
        projects: { select: { projectId: true }, take: 1 },
      },
    });
    if (!token?.isActive || (token.expiresAt && token.expiresAt.getTime() <= Date.now())) {
      // Unknown/dead credentials are NOT cached (a garbage-string flood would
      // grow the map unboundedly) — they just share the IP bucket.
      return fallback;
    }

    const resolved: ResolvedThrottle = {
      tracker: `api:token:${token.id}`,
      limit: await this.resolvePlanLimit(token.projects[0]?.projectId),
    };
    this.credentialCache.set(hashed, {
      ...resolved,
      expiresAt: Date.now() + ApiThrottlerGuard.CACHE_TTL_MS,
    });
    return resolved;
  }

  private async resolvePlanLimit(projectId: string | undefined): Promise<number> {
    // Self-hosted deployments have no plans: flat, env-configurable limit.
    if (this.config.get('globalConfig.isSelfHostedMode')) {
      return this.config.get<number>('API_THROTTLE_LIMIT', 1000);
    }
    if (!projectId) {
      return this.config.get<number>('API_THROTTLE_FALLBACK_LIMIT', 100);
    }
    // Same subscription resolution as the environment/team-member limits
    // (projects.service.resolveProjectFeatures) — no subscription = Hobby.
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { subscriptionId: true },
    });
    const subscription = project?.subscriptionId
      ? await this.prisma.subscription.findFirst({
          where: { subscriptionId: project.subscriptionId, projectId },
          select: { planType: true, overridePlan: true },
        })
      : null;
    return resolvePlanFeatures(subscription?.planType ?? PlanType.HOBBY, subscription?.overridePlan)
      .apiRateLimit;
  }
}
