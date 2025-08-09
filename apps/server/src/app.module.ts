import { AnalyticsModule } from '@/analytics/analytics.module';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AttributesModule } from '@/attributes/attributes.module';
import { AuthModule } from '@/auth/auth.module';
import { BizModule } from '@/biz/biz.module';
import config from '@/common/configs/config';
import { ContentModule } from '@/content/content.module';
import { EnvironmentsModule } from '@/environments/environments.module';
import { EventsModule } from '@/events/events.module';
import { GqlConfigService } from '@/gql-config.service';
import { ProjectsModule } from '@/projects/projects.module';
import { ThemesModule } from '@/themes/themes.module';
import { UsersModule } from '@/users/users.module';
import { UtilitiesModule } from '@/utilities/utilities.module';
import { WebSocketModule } from '@/web-socket/web-socket.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { PrismaModule } from 'nestjs-prisma';
import { AppResolver } from './app.resolver';
import { LocalizationsModule } from './localizations/localizations.module';
import { TeamModule } from './team/team.module';
import { BullModule } from '@nestjs/bullmq';
import { StripeModule } from '@golevelup/nestjs-stripe';
import { SubscriptionModule } from './subscription/subscription.module';
import { LoggerModule } from 'nestjs-pino';
// import api from '@opentelemetry/api';
import { OpenAPIModule } from './openapi/openapi.module';
import { IntegrationModule } from './integration/integration.module';
import { LicenseModule } from './license/license.module';
import { SharedModule } from './shared/shared.module';
import { loggingMiddleware } from 'nestjs-prisma';
import { Logger } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),
    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: {
        middlewares: [
          // Conditionally enable Prisma logging based on environment variable
          ...(process.env.ENABLE_PRISMA_LOGGING === 'true'
            ? [
                loggingMiddleware({
                  logger: new Logger('PrismaMiddleware'),
                  logLevel: 'log',
                }),
              ]
            : []),
        ],
      },
    }),
    LoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: {
          redact: {
            paths: ['pid', 'hostname', 'req.headers'],
            remove: true,
          },
          autoLogging: false,
          genReqId: () => undefined,
          customSuccessObject: (req) => ({
            env: process.env.NODE_ENV,
            uid: (req as any).user?.id || 'anonymous',
          }),
          level: 'debug',
          transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        },
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          family: 0,
          password: configService.get('redis.password') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    (StripeModule as any).forRootAsync(StripeModule, {
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        apiKey: configService.get('stripe.apiKey'),
        webhookConfig: {
          stripeSecrets: {
            account: configService.get('stripe.webhookSecret.account'),
            accountTest: configService.get('stripe.webhookSecret.accountTest'),
          },
          requestBodyProperty: 'rawBody',
        },
      }),
      inject: [ConfigService],
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useClass: GqlConfigService,
    }),
    HttpModule,
    WebSocketModule,
    AuthModule,
    UsersModule,
    ContentModule,
    EnvironmentsModule,
    ProjectsModule,
    UtilitiesModule,
    ThemesModule,
    AttributesModule,
    EventsModule,
    BizModule,
    AnalyticsModule,
    LocalizationsModule,
    TeamModule,
    SubscriptionModule,
    IntegrationModule,
    LicenseModule,
    OpenAPIModule,
    SharedModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}
