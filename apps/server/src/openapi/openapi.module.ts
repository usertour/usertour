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
import { ApiTokenModule } from '@/api-token/api-token.module';
import { OpenAPIV2UsersController } from './v2/users/users.controller';
import { OpenAPIV2CompaniesController } from './v2/companies/companies.controller';
import { OpenAPIV2ContentSessionsController } from './v2/content-sessions/content-sessions.controller';
import { OpenAPIV2ContentController } from './v2/content/content.controller';
import { OpenAPIV2AttributeDefinitionsController } from './v2/attribute-definitions/attribute-definitions.controller';
import { OpenAPIV2EventDefinitionsController } from './v2/event-definitions/event-definitions.controller';

@Module({
  imports: [
    ConfigModule,
    AnalyticsModule,
    AttributesModule,
    EventsModule,
    BizModule,
    ContentModule,
    ApiTokenModule,
  ],
  controllers: [
    OpenAPICompaniesController,
    OpenAPIAttributeDefinitionsController,
    OpenAPIEventDefinitionsController,
    OpenAPIUsersController,
    OpenAPICompanyMembershipsController,
    OpenAPIContentController,
    OpenAPIContentSessionsController,
    OpenAPIV2UsersController,
    OpenAPIV2CompaniesController,
    OpenAPIV2ContentSessionsController,
    OpenAPIV2ContentController,
    OpenAPIV2AttributeDefinitionsController,
    OpenAPIV2EventDefinitionsController,
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
