import { Logger as NestLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from 'nestjs-prisma';
import { RedisIoAdapter } from './adapters/redis-io.adapter';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import cookieParser from 'cookie-parser';
import { OpenAPIModule } from './openapi/openapi.module';
import { ApiModule } from './api/api.module';
import { normalizeOpenApiParameters } from './common/openapi/normalize-parameters';
import { configureApp } from './configure-app';

// Import tracer for OpenTelemetry
import { startTracer } from './tracer';
import { setTraceID } from './utils/middleware/set-trace-id';

// import { AllExceptionsFilter } from './common/filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bufferLogs: false,
  });

  app.enableShutdownHooks();

  // Use pino logger
  app.useLogger(app.get(Logger));

  // Engine-level Prisma SQL logging (catches SQL inside $transaction(callback),
  // which middleware cannot see). Gated by the same env var as the middleware.
  if (process.env.ENABLE_PRISMA_LOGGING === 'true') {
    const prisma = app.get(PrismaService);
    const sqlLogger = new NestLogger('PrismaSQL');
    type QueryEvent = { query: string; params: string; duration: number; target: string };
    (prisma as unknown as { $on: (event: 'query', cb: (e: QueryEvent) => void) => void }).$on(
      'query',
      (e) => {
        sqlLogger.log(`took ${e.duration}ms ${e.query} ${e.params}`);
      },
    );
  }

  // Catch all exceptions
  // app.useGlobalFilters(new AllExceptionsFilter());

  // Add error handlers
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
  });

  // Validation (shared with the e2e bootstrap via configureApp)
  configureApp(app);

  // trust proxy
  app.set('trust proxy', true);

  // OpenAPI documentation configuration
  const config = new DocumentBuilder()
    .setTitle('UserTour API')
    .setDescription('The UserTour API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  // v1 (OpenAPIModule, @ApiProperty DTOs) and v2 (ApiModule, zod DTOs) are
  // scanned into one document; cleanupOpenApiDoc renders the zod-derived schemas.
  // normalizeOpenApiParameters fixes union query params (singleOrArray) that
  // nestjs-zod renders with `anyOf` at the parameter top level — invalid per the
  // OpenAPI spec, rejected by strict validators (swagger-parser, Mintlify).
  const document = normalizeOpenApiParameters(
    cleanupOpenApiDoc(
      SwaggerModule.createDocument(app, config, {
        include: [OpenAPIModule, ApiModule],
      }),
    ),
  );
  SwaggerModule.setup('api', app, document);

  // A v2-only OpenAPI document (ApiModule, contract-first zod), served at
  // /api-v2 (UI) + /api-v2-json (JSON). The public docs site renders the v2 API
  // reference directly from this URL — no committed snapshot, no drift.
  //
  // A cross-origin OpenAPI client (the docs site, served from another host) reads
  // the request base URL ONLY from the spec's `servers` — there is no docs-side
  // override. So the deployment supplies its public API URL via OPENAPI_SERVER_URL
  // (ops config, not hard-coded): cloud sets it. Self-host may leave it unset —
  // the same-origin Swagger UI at /api-v2 then falls back to the browser origin.
  const v2Builder = new DocumentBuilder()
    .setTitle('Usertour API v2')
    .setDescription('Project-scoped v2 API — personal API token (utp_) authentication.')
    .setVersion('2.0')
    .addBearerAuth();
  if (process.env.OPENAPI_SERVER_URL) {
    v2Builder.addServer(process.env.OPENAPI_SERVER_URL);
  }
  const v2Document = normalizeOpenApiParameters(
    cleanupOpenApiDoc(
      SwaggerModule.createDocument(app, v2Builder.build(), { include: [ApiModule] }),
    ),
  );
  SwaggerModule.setup('api-v2', app, v2Document);

  const configService = app.get(ConfigService);
  // Uncomment these lines to use the Redis adapter:
  const adapter = new RedisIoAdapter(app);
  await adapter.connectToRedis();
  app.useWebSocketAdapter(adapter);
  app.use(cookieParser());

  // Add trace ID middleware
  app.use(setTraceID);

  /**
   * Limit the number of user's requests
   * 1000 requests per minute
   */
  // app.use(
  //   rateLimit({
  //     headers: false,
  //     windowMs: ms('1m'),
  //     max: 1000,
  //   }),
  // );

  // Start tracer
  startTracer();

  await app.listen(configService.get('nest.port'));
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
