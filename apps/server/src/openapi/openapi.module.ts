import { Module } from '@nestjs/common';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { PrismaService } from '@/prisma.service';
import { OpenapiGuard } from './openapi.guard';
import { APP_FILTER } from '@nestjs/core';
import { OpenAPIExceptionFilter } from './filters/openapi-exception.filter';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [UserController],
  providers: [
    UserService,
    PrismaService,
    OpenapiGuard,
    {
      provide: APP_FILTER,
      useClass: OpenAPIExceptionFilter,
    },
  ],
})
export class OpenapiModule {}
