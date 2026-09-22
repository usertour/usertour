import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';
import { LicenseModule } from '@/license/license.module';
import { PasswordService } from '@/auth/password.service';
import { TeamModule } from '@/modules/team/team.module';

@Module({
  imports: [LicenseModule, TeamModule],
  providers: [AdminService, AdminResolver, PasswordService],
  exports: [AdminService],
})
export class AdminModule {}
