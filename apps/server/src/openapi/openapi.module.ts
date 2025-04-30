import { Module } from '@nestjs/common';
import { OpenAPIKeyGuard } from './openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { OpenAPICompaniesController } from './companies/companies.controller';
import { OpenAPICompaniesService } from './companies/companies.service';
import { OpenAPIContentsController } from './contents/contents.controller';
import { OpenAPIContentsService } from './contents/contents.service';
import { OpenAPIContentSessionsController } from './content-sessions/content-sessions.controller';
import { OpenAPIContentSessionsService } from './content-sessions/content-sessions.service';
import { AnalyticsModule } from '@/analytics/analytics.module';
import { OpenAPIAttributesController } from './attributes/attributes.controller';
import { OpenAPIAttributesService } from './attributes/attributes.service';
import { AttributesModule } from '@/attributes/attributes.module';
import { OpenAPIEventsController } from './event-definitions/event-definitions.controller';
import { EventsModule } from '@/events/events.module';
import { OpenAPIUsersController } from './users/users.controller';
import { OpenAPIUsersService } from './users/users.service';
import { BizModule } from '@/biz/biz.module';
import { OpenAPIEventsService } from './event-definitions/event-definitions.service';
import { OpenAPICompanyMembershipsController } from './company-memberships/company-memberships.controller';
import { OpenAPICompanyMembershipsService } from './company-memberships/company-memberships.service';
import { ContentsModule } from '@/contents/contents.module';

@Module({
  imports: [
    ConfigModule,
    AnalyticsModule,
    AttributesModule,
    EventsModule,
    BizModule,
    ContentsModule,
  ],
  controllers: [
    OpenAPICompaniesController,
    OpenAPIAttributesController,
    OpenAPIEventsController,
    OpenAPIUsersController,
    OpenAPICompanyMembershipsController,
    OpenAPIContentsController,
    OpenAPIContentSessionsController,
  ],
  providers: [
    OpenAPIKeyGuard,
    OpenAPIExceptionFilter,
    OpenAPICompaniesService,
    OpenAPIAttributesService,
    OpenAPIEventsService,
    OpenAPIUsersService,
    OpenAPICompanyMembershipsService,
    OpenAPIContentsService,
    OpenAPIContentSessionsService,
  ],
})
export class OpenAPIModule {}
