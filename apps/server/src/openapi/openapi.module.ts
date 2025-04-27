import { Module } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { OpenapiGuard } from './openapi.guard';
import { OpenAPIExceptionFilter } from './filters/openapi-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { BizService } from '@/biz/biz.service';
import { CompanyController } from './company/company.controller';
import { CompanyService } from './company/company.service';
import { CompanyMembershipController } from './company_membership/company_membership.controller';
import { CompanyMembershipService } from './company_membership/company_membership.service';
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

@Module({
  imports: [ConfigModule, AnalyticsModule, AttributesModule, EventsModule, BizModule],
  controllers: [
    CompanyController,
    CompanyMembershipController,
    ContentController,
    ContentSessionController,
    OpenAPIAttributesController,
    OpenAPIEventsController,
    OpenAPIUsersController,
  ],
  providers: [
    CompanyService,
    CompanyMembershipService,
    ContentService,
    PrismaService,
    OpenapiGuard,
    BizService,
    OpenAPIExceptionFilter,
    ContentSessionService,
    OpenAPIAttributesService,
    OpenAPIEventsService,
    OpenAPIUsersService,
  ],
})
export class OpenapiModule {}
