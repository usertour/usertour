import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_AMPLITUDE_EVENT, QUEUE_HEAP_EVENT } from '@/common/consts/queen';
import { PrismaService } from 'nestjs-prisma';
import { UpdateIntegrationInput } from './integration.dto';
import { ParamsError } from '@/common/errors';
import {
  AMPLITUDE_API_ENDPOINT,
  AMPLITUDE_API_ENDPOINT_EU,
  HEAP_API_ENDPOINT,
} from '@/common/consts/endpoint';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { TrackEventData } from '@/common/types/track';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectQueue(QUEUE_AMPLITUDE_EVENT) private amplitudeQueue: Queue,
    @InjectQueue(QUEUE_HEAP_EVENT) private heapQueue: Queue,
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  /**
   * Track an event to the integration
   * @param data - The event data
   * @returns The event data
   */
  async trackEvent(data: TrackEventData): Promise<any> {
    const { environmentId } = data;

    // Get Amplitude integration
    const integration = await this.prisma.integration.findMany({
      where: {
        environmentId,
        enabled: true,
      },
    });
    if (integration.find((i) => i.code === 'amplitude')) {
      await this.amplitudeQueue.add('trackEvent', data);
    }
    if (integration.find((i) => i.code === 'heap')) {
      await this.heapQueue.add('trackEvent', data);
    }
  }

  /**
   * Find all integrations for a given environment
   * @param environmentId - The ID of the environment
   * @returns List of integrations
   */
  async findAllIntegrations(environmentId: string) {
    return this.prisma.integration.findMany({
      where: {
        environmentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find a specific integration by ID and environment ID
   * @param environmentId - The ID of the environment
   * @param id - The ID of the integration
   * @returns The integration if found
   * @throws ParamsError if integration not found
   */
  async findOneIntegration(environmentId: string, id: string) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        id,
        environmentId,
      },
    });

    if (!integration) {
      throw new ParamsError('Integration not found');
    }

    return integration;
  }

  /**
   * Update an integration's configuration
   * @param environmentId - The ID of the environment
   * @param code - The code of the integration
   * @param input - The update data
   * @returns The updated integration
   */
  async updateIntegration(environmentId: string, code: string, input: UpdateIntegrationInput) {
    const updateData: any = {};
    if (input.enabled !== undefined) updateData.enabled = input.enabled;
    if (input.key !== undefined) updateData.key = input.key;
    if (input.config !== undefined) updateData.config = input.config;

    return this.prisma.integration.upsert({
      where: { environmentId_code: { environmentId, code } },
      update: updateData,
      create: {
        environmentId,
        code,
        ...updateData,
      },
    });
  }

  /**
   * Track an event to Amplitude
   * @param data - The event data
   * @returns The event data
   */
  async trackAmplitudeEvent(data: TrackEventData): Promise<void> {
    const { eventName, userId, environmentId, eventProperties, userProperties } = data;

    // Get Amplitude integration
    const integration = await this.prisma.integration.findFirst({
      where: {
        environmentId,
        code: 'amplitude',
        enabled: true,
      },
    });

    if (!integration?.key) {
      throw new ParamsError('Amplitude integration not configured for environment');
    }
    const endpoint =
      (integration?.config as { region?: string })?.region === 'EU'
        ? AMPLITUDE_API_ENDPOINT_EU
        : AMPLITUDE_API_ENDPOINT;

    const event = {
      event_type: eventName,
      user_id: userId,
      event_properties: eventProperties,
      user_properties: userProperties,
      time: Date.now(),
    };

    await firstValueFrom(
      this.httpService.post(
        endpoint,
        {
          api_key: integration.key,
          events: [event],
        },
        {
          timeout: 5000,
        },
      ),
    );
  }

  /**
   * Track an event to Heap
   * @param data - The event data
   * @returns The event data
   */
  async trackHeapEvent(data: TrackEventData): Promise<void> {
    const { eventName, userId, environmentId, eventProperties, bizSessionId } = data;

    // Get Heap integration
    const integration = await this.prisma.integration.findFirst({
      where: {
        environmentId,
        code: 'heap',
        enabled: true,
      },
    });

    if (!integration?.key) {
      throw new ParamsError('Heap integration not configured for environment');
    }

    const event = {
      app_id: integration.key,
      identity: userId,
      event: eventName,
      session_id: bizSessionId,
      properties: {
        ...eventProperties,
      },
      timestamp: new Date().toISOString(),
    };

    this.logger.debug(`Tracking event to Heap: ${JSON.stringify(event)}`);

    await firstValueFrom(
      this.httpService.post(HEAP_API_ENDPOINT, event, {
        timeout: 5000,
      }),
    );
  }
}
