import { GraphQLModule } from "@nestjs/graphql";
import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule, loggingMiddleware } from "nestjs-prisma";
import { AppController } from "@/app.controller";
import { AppService } from "@/app.service";
import { AppResolver } from "./app.resolver";
import { AuthModule } from "@/auth/auth.module";
import { UsersModule } from "@/users/users.module";
import { ThemesModule } from "@/themes/themes.module";
import { AttributesModule } from "@/attributes/attributes.module";
import { EventsModule } from "@/events/events.module";
import { BizModule } from "@/biz/biz.module";
import { AnalyticsModule } from "@/analytics/analytics.module";
import { ContentsModule } from "@/contents/contents.module";
import { EnvironmentsModule } from "@/environments/environments.module";
import { ProjectsModule } from "@/projects/projects.module";
import config from "@/common/configs/config";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { GqlConfigService } from "@/gql-config.service";
import { WebSocketModule } from "@/web-socket/web-socket.module";
import { UtilitiesModule } from "@/utilities/utilities.module";
import { HttpModule } from "@nestjs/axios";
import { PrismaService } from "@/prisma.service";
import { LocalizationsModule } from "./localizations/localizations.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: {
        middlewares: [
          // configure your prisma middleware
          loggingMiddleware({
            logger: new Logger("PrismaMiddleware"),
            logLevel: "log",
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
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver, PrismaService],
})
export class AppModule {}
