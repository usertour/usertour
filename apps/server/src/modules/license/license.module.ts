import { Module } from '@nestjs/common';
import { LicenseService } from './services/license.service';

@Module({
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {}
