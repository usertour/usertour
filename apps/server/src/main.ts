import { NestApplicationOptions, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { PrismaClientExceptionFilter, PrismaService } from "nestjs-prisma";
import { AppModule } from "./app.module";
import type {
  CorsConfig,
  NestConfig,
  SwaggerConfig,
} from "@/common/configs/config.interface";
import { WsAdapter } from "@nestjs/platform-ws";
import { RedisIoAdapter } from "./adapters/redis-io.adapter";
import { PostgresIoAdapter } from "./adapters/postgres.adapter";
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

  // enable shutdown hook
  // const prismaService: PrismaService = app.get(PrismaService);
  // await prismaService.enableShutdownHooks(app);

  // Prisma Client Exception Filter for unhandled exceptions
  // const { httpAdapter } = app.get(HttpAdapterHost);
  // app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  const configService = app.get(ConfigService);
  const nestConfig = configService.get<NestConfig>("nest");
  const corsConfig = configService.get<CorsConfig>("cors");
  // const swaggerConfig = configService.get<SwaggerConfig>("swagger");

  // Swagger Api
  // if (swaggerConfig.enabled) {
  //   const options = new DocumentBuilder()
  //     .setTitle(swaggerConfig.title || "Nestjs")
  //     .setDescription(swaggerConfig.description || "The nestjs API description")
  //     .setVersion(swaggerConfig.version || "1.0")
  //     .build();
  //   const document = SwaggerModule.createDocument(app, options);

  //   SwaggerModule.setup(swaggerConfig.path || "api", app, document);
  // }

  // Cors
  if (corsConfig.enabled) {
    app.enableCors();
  }
  // Uncomment these lines to use the Redis adapter:
  const adapter = new RedisIoAdapter(app);
  await adapter.connectToRedis();
  app.useWebSocketAdapter(adapter);

  // app.useWebSocketAdapter(new WsAdapter(app));

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
