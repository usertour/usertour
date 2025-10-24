import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_AMPLITUDE_EVENT,
  QUEUE_HEAP_EVENT,
  QUEUE_HUBSPOT_EVENT,
  QUEUE_MIXPANEL_EVENT,
  QUEUE_POSTHOG_EVENT,
  QUEUE_SEGMENT_EVENT,
} from '@/common/consts/queen';
import { IntegrationService } from './integration.service';
import { TrackEventData } from '@/common/types/track';

@Processor(QUEUE_AMPLITUDE_EVENT)
export class AmplitudeEventProcessor extends WorkerHost {
  private readonly logger = new Logger(AmplitudeEventProcessor.name);

  constructor(private integrationService: IntegrationService) {
    super();
  }

  async process(job: Job<TrackEventData>) {
    try {
      await this.integrationService.trackAmplitudeEvent(job.data);

      this.logger.debug(`Successfully sent event to Amplitude: ${JSON.stringify(job.data)}`);
    } catch (error) {
      this.logger.error(`Failed to send event to Amplitude: ${job.data}`, error);
    }
  }
}

@Processor(QUEUE_HEAP_EVENT)
export class HeapEventProcessor extends WorkerHost {
  private readonly logger = new Logger(HeapEventProcessor.name);

  constructor(private integrationService: IntegrationService) {
    super();
  }

  async process(job: Job<TrackEventData>) {
    try {
      await this.integrationService.trackHeapEvent(job.data);

      this.logger.debug(`Successfully sent event to Heap: ${JSON.stringify(job.data)}`);
    } catch (error) {
      this.logger.error(`Failed to send event to Heap: ${job.data}`, error);
    }
  }
}

@Processor(QUEUE_HUBSPOT_EVENT)
export class HubspotEventProcessor extends WorkerHost {
  private readonly logger = new Logger(HubspotEventProcessor.name);

  constructor(private integrationService: IntegrationService) {
    super();
  }

  async process(job: Job<TrackEventData>) {
    try {
      await this.integrationService.trackHubspotEvent(job.data);

      this.logger.debug(`Successfully sent event to HubSpot: ${JSON.stringify(job.data)}`);
    } catch (error) {
      this.logger.error(`Failed to send event to HubSpot: ${job.data}`, error);
    }
  }
}

@Processor(QUEUE_POSTHOG_EVENT)
export class PosthogEventProcessor extends WorkerHost {
  private readonly logger = new Logger(PosthogEventProcessor.name);

  constructor(private integrationService: IntegrationService) {
    super();
  }

  async process(job: Job<TrackEventData>) {
    try {
      await this.integrationService.trackPosthogEvent(job.data);

      this.logger.debug(`Successfully sent event to Posthog: ${JSON.stringify(job.data)}`);
    } catch (error) {
      this.logger.error(`Failed to send event to Posthog: ${job.data}`, error);
    }
  }
}

@Processor(QUEUE_MIXPANEL_EVENT)
export class MixpanelEventProcessor extends WorkerHost {
  private readonly logger = new Logger(MixpanelEventProcessor.name);

  constructor(private integrationService: IntegrationService) {
    super();
  }

  async process(job: Job<TrackEventData>) {
    try {
      await this.integrationService.trackMixpanelEvent(job.data);

      this.logger.debug(`Successfully sent event to Mixpanel: ${JSON.stringify(job.data)}`);
    } catch (error) {
      this.logger.error(`Failed to send event to Mixpanel: ${job.data}`, error);
    }
  }
}

@Processor(QUEUE_SEGMENT_EVENT)
export class SegmentEventProcessor extends WorkerHost {
  private readonly logger = new Logger(SegmentEventProcessor.name);

  constructor(private integrationService: IntegrationService) {
    super();
  }

  async process(job: Job<TrackEventData>) {
    try {
      await this.integrationService.trackSegmentEvent(job.data);

      this.logger.debug(`Successfully sent event to Segment: ${JSON.stringify(job.data)}`);
    } catch (error) {
      this.logger.error(`Failed to send event to Segment: ${job.data}`, error);
    }
  }
}
