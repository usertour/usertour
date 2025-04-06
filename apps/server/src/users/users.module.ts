import { PasswordService } from '@/auth/password.service';
import { Module } from '@nestjs/common';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [UsersResolver, UsersService, PasswordService],
})
export class UsersModule {}
