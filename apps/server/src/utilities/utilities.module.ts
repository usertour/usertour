import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AiModule } from '@/ai/ai.module';
import { LicenseModule } from '@/license/license.module';
import { UtilitiesResolver } from './utilities.resolver';
import { UtilitiesService } from './utilities.service';

@Module({
  imports: [HttpModule, LicenseModule, AiModule],
  providers: [UtilitiesResolver, UtilitiesService],
})
export class UtilitiesModule {}
