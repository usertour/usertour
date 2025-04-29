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

// import { AllExceptionsFilter } from './common/filter';

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

  await app.listen(configService.get('nest.port'));
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
