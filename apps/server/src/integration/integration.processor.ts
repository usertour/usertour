import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from 'nestjs-prisma';
import { AMPLITUDE_API_ENDPOINT } from '@/common/consts/endpoint';
import { QUEUE_AMPLITUDE_EVENT } from '@/common/consts/queen';
import { firstValueFrom } from 'rxjs';

interface IntegrationEventData {
  eventName: string;
  userId: string;
  environmentId: string;
  eventProperties?: Record<string, any>;
  userProperties?: Record<string, any>;
}

@Processor(QUEUE_AMPLITUDE_EVENT)
export class AmplitudeEventProcessor extends WorkerHost {
  private readonly logger = new Logger(AmplitudeEventProcessor.name);

  constructor(
    private prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async process(job: Job<IntegrationEventData>) {
    const { eventName, userId, environmentId, eventProperties, userProperties } = job.data;

    // Get Amplitude integration
    const integration = await this.prisma.integration.findFirst({
      where: {
        environmentId,
        code: 'amplitude',
        enabled: true,
      },
    });

    if (!integration?.key) {
      this.logger.warn(`Amplitude integration not configured for environment ${environmentId}`);
      return;
    }

    try {
      const event = {
        event_type: eventName,
        user_id: userId,
        event_properties: eventProperties,
        user_properties: userProperties,
        time: Date.now(),
      };

      await firstValueFrom(
        this.httpService.post(
          AMPLITUDE_API_ENDPOINT,
          {
            api_key: integration.key,
            events: [event],
          },
          {
            timeout: 5000,
          },
        ),
      );

      this.logger.debug(`Successfully sent event to Amplitude: ${eventName}`);
    } catch (error) {
      this.logger.error(`Failed to send event to Amplitude: ${eventName}`, error);
      throw error;
    }
  }
}
