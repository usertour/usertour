import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IntegrationService } from './integration.service';
import {
  AmplitudeEventProcessor,
  HeapEventProcessor,
  HubspotEventProcessor,
  PosthogEventProcessor,
} from './integration.processor';
import {
  QUEUE_AMPLITUDE_EVENT,
  QUEUE_HEAP_EVENT,
  QUEUE_HUBSPOT_EVENT,
  QUEUE_MIXPANEL_EVENT,
  QUEUE_POSTHOG_EVENT,
} from '@/common/consts/queen';
import { HttpModule } from '@nestjs/axios';
import { ProjectsModule } from '@/projects/projects.module';
import { EnvironmentsModule } from '@/environments/environments.module';
import { IntegrationResolver } from './integration.resolver';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_AMPLITUDE_EVENT }),
    BullModule.registerQueue({ name: QUEUE_MIXPANEL_EVENT }),
    BullModule.registerQueue({ name: QUEUE_POSTHOG_EVENT }),
    BullModule.registerQueue({ name: QUEUE_HEAP_EVENT }),
    BullModule.registerQueue({ name: QUEUE_HUBSPOT_EVENT }),
    BullModule.registerQueue({ name: QUEUE_POSTHOG_EVENT }),
    HttpModule,
    ProjectsModule,
    EnvironmentsModule,
  ],
  providers: [
    IntegrationService,
    IntegrationResolver,
    AmplitudeEventProcessor,
    HeapEventProcessor,
    HubspotEventProcessor,
    PosthogEventProcessor,
  ],
  exports: [IntegrationService],
})
export class IntegrationModule {}
