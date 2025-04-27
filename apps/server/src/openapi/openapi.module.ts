import { Module } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { OpenapiGuard } from './openapi.guard';
import { OpenAPIExceptionFilter } from './filters/openapi-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { BizService } from '@/biz/biz.service';
import { OpenAPICompaniesController } from './companies/companies.controller';
import { OpenAPICompaniesService } from './companies/companies.service';
import { ContentController } from './content/content.controller';
import { ContentService } from './content/content.service';
import { ContentSessionController } from './content-session/content-session.controller';
import { ContentSessionService } from './content-session/content-session.service';
import { AnalyticsModule } from '@/analytics/analytics.module';
import { OpenAPIAttributesController } from './attributes/attributes.controller';
import { OpenAPIAttributesService } from './attributes/attributes.service';
import { AttributesModule } from '@/attributes/attributes.module';
import { OpenAPIEventsController } from './events/events.controller';
import { EventsModule } from '@/events/events.module';
import { OpenAPIUsersController } from './users/users.controller';
import { OpenAPIUsersService } from './users/users.service';
import { BizModule } from '@/biz/biz.module';
import { OpenAPIEventsService } from './events/events.service';
import { OpenAPICompanyMembershipController } from './company_memberships/company_memberships.controller';
import { OpenAPICompanyMembershipService } from './company_memberships/company_memberships.service';

@Module({
  imports: [ConfigModule, AnalyticsModule, AttributesModule, EventsModule, BizModule],
  controllers: [
    OpenAPICompaniesController,
    OpenAPIAttributesController,
    OpenAPIEventsController,
    OpenAPIUsersController,
    OpenAPICompanyMembershipController,
    ContentController,
    ContentSessionController,
  ],
  providers: [
    OpenAPICompaniesService,
    OpenAPIExceptionFilter,
    OpenAPIAttributesService,
    OpenAPIEventsService,
    OpenAPIUsersService,
    OpenAPICompanyMembershipService,
    ContentService,
    PrismaService,
    OpenapiGuard,
    BizService,
    ContentSessionService,
  ],
})
export class OpenapiModule {}
