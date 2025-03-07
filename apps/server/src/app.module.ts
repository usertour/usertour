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
import { PrismaService } from '@/prisma.service';
import { ProjectsModule } from '@/projects/projects.module';
import { ThemesModule } from '@/themes/themes.module';
import { UsersModule } from '@/users/users.module';
import { UtilitiesModule } from '@/utilities/utilities.module';
import { WebSocketModule } from '@/web-socket/web-socket.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { HttpModule } from '@nestjs/axios';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { PrismaModule, loggingMiddleware } from 'nestjs-prisma';
import { AppResolver } from './app.resolver';
import { LocalizationsModule } from './localizations/localizations.module';
import { TeamModule } from './team/team.module';
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
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver, PrismaService],
})
export class AppModule {}
