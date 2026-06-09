import { Module } from '@nestjs/common';
import { OpenAPIKeyGuard } from './openapi.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from '@/analytics/analytics.module';
import { AttributesModule } from '@/attributes/attributes.module';
import { EventsModule } from '@/events/events.module';
import { BizModule } from '@/biz/biz.module';
import { ContentModule } from '@/content/content.module';
import { OpenAPICompaniesController } from './companies/companies.controller';
import { OpenAPICompaniesService } from './companies/companies.service';
import { OpenAPIContentController } from './content/content.controller';
import { OpenAPIContentService } from './content/content.service';
import { OpenAPIContentSessionsController } from './content-sessions/content-sessions.controller';
import { OpenAPIContentSessionsService } from './content-sessions/content-sessions.service';
import { OpenAPIUsersController } from './users/users.controller';
import { OpenAPIUsersService } from './users/users.service';
import { OpenAPIAttributeDefinitionsController } from './attribute-definitions/attribute-definitions.controller';
import { OpenAPIAttributeDefinitionsService } from './attribute-definitions/attribute-definitions.service';
import { OpenAPICompanyMembershipsController } from './company-memberships/company-memberships.controller';
import { OpenAPICompanyMembershipsService } from './company-memberships/company-memberships.service';
import { OpenAPIEventDefinitionsController } from './event-definitions/event-definitions.controller';
import { OpenAPIEventDefinitionsService } from './event-definitions/event-definitions.service';

@Module({
  imports: [
    ConfigModule,
    AnalyticsModule,
    AttributesModule,
    EventsModule,
    BizModule,
    ContentModule,
  ],
  controllers: [
    OpenAPICompaniesController,
    OpenAPIAttributeDefinitionsController,
    OpenAPIEventDefinitionsController,
    OpenAPIUsersController,
    OpenAPICompanyMembershipsController,
    OpenAPIContentController,
    OpenAPIContentSessionsController,
  ],
  providers: [
    OpenAPIKeyGuard,
    OpenAPIExceptionFilter,
    OpenAPICompaniesService,
    OpenAPIAttributeDefinitionsService,
    OpenAPIEventDefinitionsService,
    OpenAPIUsersService,
    OpenAPICompanyMembershipsService,
    OpenAPIContentService,
    OpenAPIContentSessionsService,
  ],
})
export class OpenAPIModule {}
