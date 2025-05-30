import { AnalyticsModule } from '@/analytics/analytics.module';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AttributesModule } from '@/attributes/attributes.module';
import { AuthModule } from '@/auth/auth.module';
import { BizModule } from '@/biz/biz.module';
import config from '@/common/configs/config';
import { ContentsModule } from '@/contents/contents.module';
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
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { PrismaModule, loggingMiddleware } from 'nestjs-prisma';
import { AppResolver } from './app.resolver';
import { LocalizationsModule } from './localizations/localizations.module';
import { TeamModule } from './team/team.module';
import { BullModule } from '@nestjs/bullmq';
import { StripeModule } from '@golevelup/nestjs-stripe';
import { SubscriptionModule } from './subscription/subscription.module';
import { LoggerModule } from 'nestjs-pino';
import api from '@opentelemetry/api';
import { DbMonitorModule } from './common/db-monitor/db-monitor.module';

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
          // configure your prisma middleware
          loggingMiddleware({
            logger: new Logger('PrismaMiddleware'),
            logLevel: 'log',
          }),
        ],
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        redact: {
          paths: ['pid', 'hostname', 'req.headers'],
          remove: true,
        },
        autoLogging: false,
        genReqId: () => api.trace.getSpan(api.context.active())?.spanContext()?.traceId,
        customSuccessObject: (req) => ({
          env: process.env.NODE_ENV,
          uid: (req as any).user?.id || 'anonymous',
        }),
        transport: {
          target: process.env.NODE_ENV !== 'production' ? 'pino-pretty' : 'pino/file',
          options: {
            destination: 1, // stdout
            sync: false,
          },
        },
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          url: configService.get('redis.url'),
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
    ContentsModule,
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
    DbMonitorModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}
