import { Module } from '@nestjs/common';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { PrismaService } from '@/prisma.service';
import { OpenapiGuard } from './openapi.guard';
import { OpenAPIExceptionFilter } from './filters/openapi-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { BizService } from '@/biz/biz.service';

@Module({
  imports: [ConfigModule],
  controllers: [UserController],
  providers: [UserService, PrismaService, OpenapiGuard, BizService, OpenAPIExceptionFilter],
})
export class OpenapiModule {}
