import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IntegrationService } from './integration.service';
import {
  AmplitudeEventProcessor,
  HeapEventProcessor,
  HubspotEventProcessor,
  MixpanelEventProcessor,
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
import { BizModule } from '@/biz/biz.module';
import { IntegrationController } from './integration.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_AMPLITUDE_EVENT }),
    BullModule.registerQueue({ name: QUEUE_MIXPANEL_EVENT }),
    BullModule.registerQueue({ name: QUEUE_POSTHOG_EVENT }),
    BullModule.registerQueue({ name: QUEUE_HEAP_EVENT }),
    BullModule.registerQueue({ name: QUEUE_HUBSPOT_EVENT }),
    BullModule.registerQueue({ name: QUEUE_POSTHOG_EVENT }),
    BullModule.registerQueue({ name: QUEUE_MIXPANEL_EVENT }),
    HttpModule,
    ProjectsModule,
    BizModule,
    EnvironmentsModule,
  ],
  providers: [
    IntegrationService,
    IntegrationResolver,
    AmplitudeEventProcessor,
    HeapEventProcessor,
    HubspotEventProcessor,
    PosthogEventProcessor,
    MixpanelEventProcessor,
  ],
  controllers: [IntegrationController],
  exports: [IntegrationService],
})
export class IntegrationModule {}
