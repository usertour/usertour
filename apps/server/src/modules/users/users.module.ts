import { PasswordService } from '@/modules/auth/services/password.service';
import { Module } from '@nestjs/common';
import { UsersResolver } from './users.resolver';
import { UsersService } from './services/users.service';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [UsersResolver, UsersService, PasswordService],
})
export class UsersModule {}
