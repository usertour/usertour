import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { AnalyticsModule } from '@/analytics/analytics.module';
import { ApiTokenModule } from '@/api-token/api-token.module';
import { AttributesModule } from '@/attributes/attributes.module';
import { BizModule } from '@/biz/biz.module';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { V2FallbackExceptionFilter } from '@/common/filters/v2-fallback-exception.filter';
import { ApiThrottlerGuard } from './shared/api-throttler.guard';
import { ContentModule } from '@/content/content.module';
import { EnvironmentsModule } from '@/environments/environments.module';
import { EventsModule } from '@/events/events.module';
import { ThemesModule } from '@/themes/themes.module';

import { ApiAnalyticsController } from './analytics/analytics.controller';
import { ApiAnalyticsService } from './analytics/analytics.service';
import { ApiAttributeDefinitionsController } from './attribute-definitions/attribute-definitions.controller';
import { ApiAttributeDefinitionsService } from './attribute-definitions/attribute-definitions.service';
import { ApiCompaniesController } from './companies/companies.controller';
import { ApiCompaniesService } from './companies/companies.service';
import { ApiContentController } from './content/content.controller';
import { ApiContentService } from './content/content.service';
import { ApiContentSessionsController } from './content-sessions/content-sessions.controller';
import { ApiContentSessionsService } from './content-sessions/content-sessions.service';
import { ApiContentVersionsController } from './content-versions/content-versions.controller';
import { ApiContentVersionsService } from './content-versions/content-versions.service';
import { ApiEnvironmentsController } from './environments/environments.controller';
import { ApiEnvironmentsService } from './environments/environments.service';
import { ApiEventDefinitionsController } from './event-definitions/event-definitions.controller';
import { ApiEventDefinitionsService } from './event-definitions/event-definitions.service';
import { ApiSegmentMembersController, ApiSegmentsController } from './segments/segments.controller';
import { ApiSegmentsService } from './segments/segments.service';
import { ApiThemesController } from './themes/themes.controller';
import { ApiThemesService } from './themes/themes.service';
import { ApiUsersController } from './users/users.controller';
import { ApiUsersService } from './users/users.service';

/**
 * The contract-first v2 public API. A peer of (not nested in) the legacy
 * {@link OpenAPIModule}: each resource is defined by zod schemas that drive
 * request validation, the OpenAPI spec, and the MCP tool binding from one source.
 * Depends only on the domain layer + api-token auth, never on the legacy facade.
 */
@Module({
  imports: [
    // v2 REST rate limiting (per credential; see ApiThrottlerGuard). Module-
    // scoped ThrottlerModule — the websocket gateway configures its own.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // The library's headers are name-suffixed (X-RateLimit-Limit-Api) and
        // useless to standard clients; ApiThrottlerGuard sets the standard,
        // unsuffixed ones itself.
        setHeaders: false,
        throttlers: [
          {
            name: 'api',
            ttl: config.get<number>('API_THROTTLE_TTL', 60_000),
            limit: config.get<number>('API_THROTTLE_LIMIT', 1000),
          },
        ],
      }),
    }),
    ApiTokenModule,
    EventsModule,
    AttributesModule,
    ContentModule,
    BizModule,
    AnalyticsModule,
    ThemesModule,
    EnvironmentsModule,
  ],
  // Order here drives the OpenAPI tag order (NestJS emits operations per controller),
  // which is what the docs sidebar renders: core content first, audience next,
  // schema/definitions last.
  controllers: [
    ApiAnalyticsController,
    ApiContentController,
    ApiContentVersionsController,
    ApiThemesController,
    ApiUsersController,
    ApiCompaniesController,
    ApiSegmentsController,
    ApiSegmentMembersController,
    ApiContentSessionsController,
    ApiAttributeDefinitionsController,
    ApiEventDefinitionsController,
    ApiEnvironmentsController,
  ],
  providers: [
    ApiAnalyticsService,
    ApiEventDefinitionsService,
    ApiAttributeDefinitionsService,
    ApiContentService,
    ApiContentVersionsService,
    ApiUsersService,
    ApiCompaniesService,
    ApiContentSessionsService,
    ApiThemesService,
    ApiSegmentsService,
    ApiEnvironmentsService,
    OpenAPIExceptionFilter,
    // Global fallback: keeps the v2 error envelope for exceptions thrown BEFORE
    // any route handler (body-parser JSON failures, unknown /v2 routes) that the
    // controller-scoped OpenAPIExceptionFilter can never see. Non-/v2 traffic
    // keeps the default behavior.
    { provide: APP_FILTER, useClass: V2FallbackExceptionFilter },
    // Global guard, no-op off /v2 (see ApiThrottlerGuard).
    { provide: APP_GUARD, useClass: ApiThrottlerGuard },
  ],
  // Exported for the MCP module, which binds these read services as tools.
  exports: [
    ApiAnalyticsService,
    ApiContentService,
    ApiContentVersionsService,
    ApiAttributeDefinitionsService,
    ApiEventDefinitionsService,
    ApiUsersService,
    ApiThemesService,
    ApiCompaniesService,
    ApiSegmentsService,
    ApiContentSessionsService,
    ApiEnvironmentsService,
  ],
})
export class ApiModule {}
