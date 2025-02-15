import * as fs from 'node:fs';
import { NestApplicationOptions, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { rateLimit } from 'express-rate-limit';
import { RedisIoAdapter } from './adapters/redis-io.adapter';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filter';
import { ms } from './utils/hs';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const options: NestApplicationOptions = {};
  //for local

  if (fs.existsSync('./src/cert')) {
    const key = fs.readFileSync('./src/cert/key.pem');
    const cert = fs.readFileSync('./src/cert/cert.pem');
    options.httpsOptions = { key, cert };
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, options);
  app.enableShutdownHooks();

  // Catch all exceptions
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validation
  app.useGlobalPipes(new ValidationPipe());

  // trust proxy
  app.set('trust proxy', true);

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
  app.use(
    rateLimit({
      headers: false,
      windowMs: ms('1m'),
      max: 1000,
    }),
  );

  await app.listen(configService.get('nest.port'));
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
