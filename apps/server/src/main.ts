import { NestApplicationOptions, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import type { NestConfig } from "@/common/configs/config.interface";
import { RedisIoAdapter } from "./adapters/redis-io.adapter";
import * as fs from "fs";
import { AllExceptionsFilter } from "./common/filter";
import { rateLimit } from "express-rate-limit";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ms } from "./utils/hs";

async function bootstrap() {
  let options: NestApplicationOptions = {};
  //for local

  if (fs.existsSync("./src/cert")) {
    const key = fs.readFileSync("./src/cert/key.pem");
    const cert = fs.readFileSync("./src/cert/cert.pem");
    options.httpsOptions = { key, cert };
  }
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    options
  );
  app.enableShutdownHooks();

  // Catch all exceptions
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validation
  app.useGlobalPipes(new ValidationPipe());

  const configService = app.get(ConfigService);
  const nestConfig = configService.get<NestConfig>("nest");

  // Uncomment these lines to use the Redis adapter:
  const adapter = new RedisIoAdapter(app);
  await adapter.connectToRedis();
  app.useWebSocketAdapter(adapter);

  /**
   * Limit the number of user's requests
   * 1000 requests per minute
   */
  app.use(
    rateLimit({
      headers: false,
      windowMs: ms("1m"),
      max: 1000,
    })
  );

  await app.listen(process.env.NEST_SERVER_PORT || nestConfig.port || 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
