import { Module } from '@nestjs/common';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { PrismaService } from '@/prisma.service';
import { OpenapiGuard } from './openapi.guard';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService, PrismaService, OpenapiGuard],
})
export class OpenapiModule {}
