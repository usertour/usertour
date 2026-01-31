import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LicenseService } from './license.service';
import { LicenseResolver } from './license.resolver';
import { LicenseAdminGuard } from './license-admin.guard';

@Module({
  imports: [ConfigModule],
  providers: [LicenseService, LicenseResolver, LicenseAdminGuard],
  exports: [LicenseService],
})
export class LicenseModule {}
