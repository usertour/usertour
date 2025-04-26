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

@Module({
  imports: [ConfigModule],
  controllers: [UserController, CompanyController, CompanyMembershipController, ContentController],
  providers: [
    UserService,
    CompanyService,
    CompanyMembershipService,
    ContentService,
    PrismaService,
    OpenapiGuard,
    BizService,
    OpenAPIExceptionFilter,
  ],
})
export class OpenapiModule {}
