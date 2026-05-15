import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { LicenseModule } from '@/license/license.module';
import { UtilitiesResolver } from './utilities.resolver';
import { UtilitiesService } from './utilities.service';

@Module({
  imports: [HttpModule, LicenseModule],
  providers: [UtilitiesResolver, UtilitiesService],
})
export class UtilitiesModule {}
