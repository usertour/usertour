import { Module } from '@nestjs/common';

import { AnalyticsModule } from '@/analytics/analytics.module';
import { ApiTokenModule } from '@/api-token/api-token.module';
import { AttributesModule } from '@/attributes/attributes.module';
import { BizModule } from '@/biz/biz.module';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { ContentModule } from '@/content/content.module';
import { EventsModule } from '@/events/events.module';
import { ThemesModule } from '@/themes/themes.module';

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
    ApiTokenModule,
    EventsModule,
    AttributesModule,
    ContentModule,
    BizModule,
    AnalyticsModule,
    ThemesModule,
  ],
  // Order here drives the OpenAPI tag order (NestJS emits operations per controller),
  // which is what the docs sidebar renders: core content first, audience next,
  // schema/definitions last.
  controllers: [
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
  ],
  providers: [
    ApiEventDefinitionsService,
    ApiAttributeDefinitionsService,
    ApiContentService,
    ApiContentVersionsService,
    ApiUsersService,
    ApiCompaniesService,
    ApiContentSessionsService,
    ApiThemesService,
    ApiSegmentsService,
    OpenAPIExceptionFilter,
  ],
  // Exported for the MCP module, which binds these read services as tools.
  exports: [
    ApiContentService,
    ApiContentVersionsService,
    ApiAttributeDefinitionsService,
    ApiEventDefinitionsService,
    ApiUsersService,
    ApiThemesService,
    ApiCompaniesService,
    ApiSegmentsService,
    ApiContentSessionsService,
  ],
})
export class ApiModule {}
