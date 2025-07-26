import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { RedisIoAdapter } from './adapters/redis-io.adapter';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { OpenAPIModule } from './openapi/openapi.module';

// Import Sentry for monitoring
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Import tracer for OpenTelemetry (uncomment when needed)
// import tracer from './tracer';
import { setTraceID } from './utils/middleware/set-trace-id';

// import { AllExceptionsFilter } from './common/filter';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  profilesSampleRate: 1.0,
});

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bufferLogs: false,
  });

  app.enableShutdownHooks();

  // Use pino logger
  app.useLogger(app.get(Logger));

  // Catch all exceptions
  // app.useGlobalFilters(new AllExceptionsFilter());

  // Add Sentry error handlers
  process.on('uncaughtException', (err) => {
    Sentry.captureException(err);
  });

  process.on('unhandledRejection', (err) => {
    Sentry.captureException(err);
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // trust proxy
  app.set('trust proxy', true);

  // OpenAPI documentation configuration
  const config = new DocumentBuilder()
    .setTitle('UserTour API')
    .setDescription('The UserTour API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    include: [OpenAPIModule],
  });
  SwaggerModule.setup('api', app, document);

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

  // Start tracer (uncomment when OTLP_TRACES_ENDPOINT is configured)
  // tracer.start();

  await app.listen(configService.get('nest.port'));
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
