import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IntegrationService } from './integration.service';
import { AmplitudeEventProcessor } from './integration.processor';
import {
  QUEUE_AMPLITUDE_EVENT,
  QUEUE_MIXPANEL_EVENT,
  QUEUE_POSTHOG_EVENT,
} from '@/common/consts/queen';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_AMPLITUDE_EVENT }),
    BullModule.registerQueue({ name: QUEUE_MIXPANEL_EVENT }),
    BullModule.registerQueue({ name: QUEUE_POSTHOG_EVENT }),
    HttpModule,
  ],
  providers: [IntegrationService, AmplitudeEventProcessor],
  exports: [IntegrationService],
})
export class IntegrationModule {}
