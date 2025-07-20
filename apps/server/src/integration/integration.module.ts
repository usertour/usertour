import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IntegrationService } from './integration.service';
import {
  AmplitudeEventProcessor,
  HeapEventProcessor,
  HubspotEventProcessor,
  MixpanelEventProcessor,
  PosthogEventProcessor,
  SegmentEventProcessor,
} from './integration.processor';
import {
  QUEUE_AMPLITUDE_EVENT,
  QUEUE_HEAP_EVENT,
  QUEUE_HUBSPOT_EVENT,
  QUEUE_MIXPANEL_EVENT,
  QUEUE_POSTHOG_EVENT,
  QUEUE_SEGMENT_EVENT,
} from '@/common/consts/queen';
import { HttpModule } from '@nestjs/axios';
import { ProjectsModule } from '@/projects/projects.module';
import { EnvironmentsModule } from '@/environments/environments.module';
import { IntegrationResolver } from './integration.resolver';
import { BizModule } from '@/biz/biz.module';
import { IntegrationController } from './integration.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_AMPLITUDE_EVENT }),
    BullModule.registerQueue({ name: QUEUE_MIXPANEL_EVENT }),
    BullModule.registerQueue({ name: QUEUE_POSTHOG_EVENT }),
    BullModule.registerQueue({ name: QUEUE_HEAP_EVENT }),
    BullModule.registerQueue({ name: QUEUE_HUBSPOT_EVENT }),
    BullModule.registerQueue({ name: QUEUE_POSTHOG_EVENT }),
    BullModule.registerQueue({ name: QUEUE_MIXPANEL_EVENT }),
    BullModule.registerQueue({ name: QUEUE_SEGMENT_EVENT }),
    HttpModule,
    ProjectsModule,
    BizModule,
    EnvironmentsModule,
    ConfigModule,
  ],
  providers: [
    IntegrationService,
    IntegrationResolver,
    AmplitudeEventProcessor,
    HeapEventProcessor,
    HubspotEventProcessor,
    PosthogEventProcessor,
    MixpanelEventProcessor,
    SegmentEventProcessor,
  ],
  controllers: [IntegrationController],
  exports: [IntegrationService],
})
export class IntegrationModule {}
