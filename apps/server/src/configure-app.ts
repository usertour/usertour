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
 */
export function configureApp(app: INestApplication): void {
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
