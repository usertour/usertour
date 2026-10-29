import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerStorageService } from '@nestjs/throttler';

import { AnalyticsModule } from '@/modules/analytics/analytics.module';
import { ApiTokenModule } from '@/modules/api-token/api-token.module';
import { AttributesModule } from '@/modules/attributes/attributes.module';
import { BizModule } from '@/modules/biz/biz.module';
import { OpenAPIExceptionFilter } from '@/modules/common/filters/openapi-exception.filter';
import { V2FallbackExceptionFilter } from './shared/v2-fallback-exception.filter';
import { UtilitiesModule } from '@/modules/utilities/utilities.module';
import { ApiThrottlerGuard } from './shared/api-throttler.guard';
import { ContentModule } from '@/modules/content/content.module';
import { EnvironmentsModule } from '@/modules/environments/environments.module';
import { EventsModule } from '@/modules/events/events.module';
import { LocalizationsModule } from '@/modules/localizations/localizations.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { ThemesModule } from '@/modules/themes/themes.module';
import { ReferencesModule } from '@/modules/references/references.module';

import { ApiAnalyticsController } from './analytics/analytics.controller';
import { ApiAnalyticsService } from './analytics/analytics.service';
import { ApiUsageOverviewService } from './analytics/usage-overview.service';
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
import {
  ApiLocalizationsController,
  ApiVersionLocalizationsController,
} from './localizations/localizations.controller';
import { ApiLocalizationsService } from './localizations/localizations.service';
import { ApiSegmentMembersController, ApiSegmentsController } from './segments/segments.controller';
import { ApiSegmentsService } from './segments/segments.service';
import { ApiThemesController } from './themes/themes.controller';
import { ApiThemesService } from './themes/themes.service';
import { ApiUsersController } from './users/users.controller';
import { ApiUsersService } from './users/users.service';
import { ApiWebhooksController } from './webhooks/webhooks.controller';
import { ApiLocalesController } from './locales/locales.controller';
import { ApiMeController } from './me/me.controller';
import { ApiEventsController } from './events/events.controller';
import { WebSocketModule } from '@/web-socket/web-socket.module';
import { ApiMeService } from './me/me.service';
import { ApiWebhooksService } from './webhooks/webhooks.service';
import { WebhooksModule } from '@/modules/webhooks/webhooks.module';

/**
 * The contract-first v2 public API. A peer of (not nested in) the legacy
 * {@link OpenAPIModule}: each resource is defined by zod schemas that drive
 * request validation, the OpenAPI spec, and the MCP tool binding from one source.
 * Depends only on the domain layer + api-token auth, never on the legacy facade.
 */
@Module({
  imports: [
    ApiTokenModule,
    EventsModule,
    AttributesModule,
    ContentModule,
    BizModule,
    AnalyticsModule,
    ThemesModule,
    ReferencesModule,
    EnvironmentsModule,
    LocalizationsModule,
    ProjectsModule,
    UtilitiesModule,
    WebhooksModule,
    WebSocketModule,
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
    ApiWebhooksController,
    ApiMeController,
    ApiLocalesController,
    ApiEventsController,
    ApiEnvironmentsController,
    ApiLocalizationsController,
    ApiVersionLocalizationsController,
  ],
  providers: [
    ApiMeService,
    ApiAnalyticsService,
    ApiUsageOverviewService,
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
    ApiLocalizationsService,
    ApiWebhooksService,
    OpenAPIExceptionFilter,
    // Global fallback: keeps the v2 error envelope for exceptions thrown BEFORE
    // any route handler (body-parser JSON failures, unknown /v2 routes) that the
    // controller-scoped OpenAPIExceptionFilter can never see. Non-/v2 traffic
    // keeps the default behavior.
    { provide: APP_FILTER, useClass: V2FallbackExceptionFilter },
    // v2 REST rate limiting, per credential: a global guard, no-op off /v2.
    // The guard builds its limits itself and counts in this module's own
    // storage instance; nothing registers ThrottlerModule (it is global and
    // keeps one options token, so a second registration would not add
    // limits — see apiThrottlerOptions).
    ThrottlerStorageService,
    { provide: APP_GUARD, useClass: ApiThrottlerGuard },
  ],
  // Exported for the MCP module, which binds these read services as tools.
  exports: [
    ApiAnalyticsService,
    ApiUsageOverviewService,
    ReferencesModule,
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
    ApiLocalizationsService,
    ApiWebhooksService,
  ],
})
export class ApiModule {}
