import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AiModule } from '@/modules/ai/ai.module';
import { LicenseModule } from '@/modules/license/license.module';
import { UtilitiesResolver } from './utilities.resolver';
import { UtilitiesService } from './services/utilities.service';

@Module({
  imports: [HttpModule, LicenseModule, AiModule],
  providers: [UtilitiesResolver, UtilitiesService],
  exports: [UtilitiesService],
})
export class UtilitiesModule {}
