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
  app.enableCors({ exposedHeaders: ['WWW-Authenticate'] });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
