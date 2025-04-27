import { Module } from '@nestjs/common';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
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
import { AttributeController } from './attribute/attribute.controller';
import { AttributeService } from './attribute/attribute.service';
import { AttributesModule } from '@/attributes/attributes.module';
import { OpenAPIEventsController } from './events/events.controller';
import { OpenAPIEventsService } from './events/events.service';
import { EventsModule } from '@/events/events.module';

@Module({
  imports: [ConfigModule, AnalyticsModule, AttributesModule, EventsModule],
  controllers: [
    UserController,
    CompanyController,
    CompanyMembershipController,
    ContentController,
    ContentSessionController,
    AttributeController,
    OpenAPIEventsController,
  ],
  providers: [
    UserService,
    CompanyService,
    CompanyMembershipService,
    ContentService,
    PrismaService,
    OpenapiGuard,
    BizService,
    OpenAPIExceptionFilter,
    ContentSessionService,
    AttributeService,
    OpenAPIEventsService,
  ],
})
export class OpenapiModule {}
