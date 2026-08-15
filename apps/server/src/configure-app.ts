import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/**
 * HTTP-layer request-pipeline configuration shared by the production bootstrap
 * (`main.ts`) and the e2e bootstrap (`test/e2e/create-test-app.ts`), so e2e
 * exercises the SAME request pipeline the public API runs in production.
 *
 * Only contains transport concerns that affect the request/response contract
 * (the global ValidationPipe and cookie parsing). It deliberately excludes
 * logging/tracing/redis/swagger/listen — those belong to `main.ts` alone.
 *
 * The ValidationPipe's `enableImplicitConversion` is load-bearing for the
 * OpenAPI contract: query params arrive as strings and DTOs like
 * `ListUsersQueryDto.limit` are `@IsNumber()`; without coercion the value
 * reaches Prisma `take` as a string and throws. `cookieParser` populates
 * `req.cookies`, which the auth refresh and SSO callback endpoints read.
 *
 * CORS is owned HERE (single source of truth), not in the reverse proxy, so it
 * travels with the app across any deployment topology and is exercised by the
 * same e2e that runs this pipeline. Default origin `*` is safe: a wildcard
 * forbids credentials, so a browser never sends the session cookie cross-origin
 * and every authenticated route rejects the resulting anonymous request (session
 * CSRF protection, if ever needed, is a separate origin check — not CORS's job).
 * `exposedHeaders` lets a browser MCP client read the 401 `WWW-Authenticate`
 * challenge that bootstraps its OAuth flow. Nest's built-in CORS also answers
 * OPTIONS preflight and reflects the requested headers, so the MCP `Mcp-*`
 * headers need no explicit allow-list. nginx keeps CORS ONLY for the static SDK
 * assets it serves from disk (responses that never reach this app).
 */
export function configureApp(app: INestApplication): void {
  // Express `trust proxy` for the whole pipeline (req.ip / req.protocol),
  // configurable via TRUST_PROXY in every form Express accepts — hop count,
  // true/false, or an address list. The default trusts ONLY loopback: the
  // bundled nginx in the same container is the one proxy every shipped
  // topology is guaranteed to have, and the one nothing outside the box can
  // impersonate. Anything else — including private-range peers — is treated
  // as the client itself, so its X-Forwarded-For claims are ignored. Do NOT
  // widen this to linklocal/uniquelocal: on a LAN deployment that turns
  // every internal client into a "trusted proxy", and a rotating fake XFF
  // prefix mints a fresh per-IP rate-limit bucket per request (the exact
  // bypass the old `true` had). Deployments with a real proxy in front
  // (Railway, Cloudflare, an ingress) declare it explicitly via TRUST_PROXY;
  // until then they degrade to coarse-but-safe shared buckets, never to
  // spoofable ones. Lives here, not main.ts, so e2e runs the same trust
  // semantics production does.
  const trustProxyRaw = process.env.TRUST_PROXY ?? 'loopback';
  const trustProxy = /^\d+$/.test(trustProxyRaw)
    ? Number(trustProxyRaw)
    : trustProxyRaw === 'true'
      ? true
      : trustProxyRaw === 'false'
        ? false
        : trustProxyRaw;
  app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);

  app.enableCors({ exposedHeaders: ['WWW-Authenticate'] });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
