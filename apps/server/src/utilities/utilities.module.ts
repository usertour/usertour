import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { UtilitiesResolver } from './utilities.resolver';
import { UtilitiesService } from './utilities.service';

@Module({
  imports: [HttpModule],
  providers: [UtilitiesResolver, UtilitiesService],
})
export class UtilitiesModule {}
