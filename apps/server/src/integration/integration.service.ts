import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_AMPLITUDE_EVENT,
  QUEUE_HEAP_EVENT,
  QUEUE_HUBSPOT_EVENT,
  QUEUE_MIXPANEL_EVENT,
  QUEUE_POSTHOG_EVENT,
} from '@/common/consts/queen';
import { PrismaService } from 'nestjs-prisma';
import { UpdateIntegrationInput } from './integration.dto';
import { ParamsError } from '@/common/errors';
import {
  AMPLITUDE_API_ENDPOINT,
  AMPLITUDE_API_ENDPOINT_EU,
  HEAP_API_ENDPOINT,
  HUBSPOT_API_ENDPOINT,
  MIXPANEL_API_ENDPOINT,
  MIXPANEL_API_ENDPOINT_EU,
  POSTHOG_API_ENDPOINT_EU,
  POSTHOG_API_ENDPOINT_US,
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
    @InjectQueue(QUEUE_HUBSPOT_EVENT) private hubspotQueue: Queue,
    @InjectQueue(QUEUE_POSTHOG_EVENT) private posthogQueue: Queue,
    @InjectQueue(QUEUE_MIXPANEL_EVENT) private mixpanelQueue: Queue,
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  /**
   * Track an event to the integration
   * @param data - The event data
   * @returns The event data
   */
  async trackEvent(data: TrackEventData): Promise<any> {
    const { environmentId, userProperties } = data;

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
    // Only track HubSpot event if user has an email
    if (integration.find((i) => i.code === 'hubspot' && userProperties?.email)) {
      // await this.hubspotQueue.add('trackEvent', data);
    }
    if (integration.find((i) => i.code === 'posthog')) {
      await this.posthogQueue.add('trackEvent', data);
    }
    if (integration.find((i) => i.code === 'mixpanel')) {
      await this.mixpanelQueue.add('trackEvent', data);
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
        `${endpoint}/batch`,
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
      this.httpService.post(`${HEAP_API_ENDPOINT}/api/track`, event, {
        timeout: 5000,
      }),
    );
  }

  /**
   * Track an event to HubSpot
   * @param data - The event data
   * @returns The event data
   */
  async trackHubspotEvent(data: TrackEventData): Promise<void> {
    const { eventName, environmentId, eventProperties, userProperties, projectId } = data;

    // Get HubSpot integration
    const integration = await this.prisma.integration.findFirst({
      where: {
        environmentId,
        code: 'hubspot',
        enabled: true,
      },
    });

    if (!integration?.key) {
      throw new ParamsError('HubSpot integration not configured for environment');
    }

    const { email } = userProperties;

    if (!email) {
      throw new ParamsError('User email not found');
    }

    const eventRecord = await this.prisma.event.findFirst({
      where: { codeName: eventName, projectId },
      include: {
        attributeOnEvent: {
          include: {
            attribute: true,
          },
        },
      },
    });

    const { displayName } = eventRecord;

    // Convert attribute data types to HubSpot field types
    const getHubspotFieldType = (dataType: number) => {
      switch (dataType) {
        case 1: // NUMBER
          return 'number';
        case 2: // BOOLEAN
          return 'boolean';
        case 3: // DATE
          return 'date';
        default:
          return 'string';
      }
    };

    // First, define the event
    const eventDefinition = {
      name: `usertour_${eventName}`,
      description: displayName,
      propertyDefinitions: eventRecord.attributeOnEvent.map((aoe) => ({
        name: aoe.attribute.codeName,
        label: aoe.attribute.displayName,
        type: getHubspotFieldType(aoe.attribute.dataType),
      })),
    };

    // Then send the event
    const hubspotEvent = {
      email,
      eventName: `usertour_${eventName}`,
      properties: eventProperties,
    };

    this.logger.debug(`Creating HubSpot event: ${JSON.stringify(hubspotEvent)}`);

    try {
      // Define the event
      await firstValueFrom(
        this.httpService.post(
          `${HUBSPOT_API_ENDPOINT}/events/v3/event-definitions`,
          eventDefinition,
          {
            headers: {
              Authorization: `Bearer ${integration.key}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          },
        ),
      );

      // Send the event
      await firstValueFrom(
        this.httpService.post(`${HUBSPOT_API_ENDPOINT}/events/v3/send`, hubspotEvent, {
          headers: {
            Authorization: `Bearer ${integration.key}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }),
      );
    } catch (error) {
      this.logger.error('HubSpot event creation failed:', {
        error: error.response?.data || error.message,
        event: hubspotEvent,
      });
      throw error;
    }
  }

  /**
   * Track an event to Posthog
   * @param data - The event data
   * @returns The event data
   */
  async trackPosthogEvent(data: TrackEventData): Promise<void> {
    const { eventName, environmentId, eventProperties, userId } = data;

    // Get Posthog integration
    const integration = await this.prisma.integration.findFirst({
      where: {
        environmentId,
        code: 'posthog',
        enabled: true,
      },
    });

    if (!integration?.key) {
      throw new ParamsError('Posthog integration not configured for environment');
    }

    const endpoint =
      (integration?.config as { region?: string })?.region === 'EU'
        ? POSTHOG_API_ENDPOINT_EU
        : POSTHOG_API_ENDPOINT_US;

    const event = {
      api_key: integration.key,
      event: eventName,
      distinct_id: userId,
      properties: eventProperties,
    };

    this.logger.debug(`Tracking event to Posthog: ${JSON.stringify(event)}`);

    await firstValueFrom(
      this.httpService.post(`${endpoint}/i/v0/e/`, event, {
        timeout: 5000,
      }),
    );
  }

  async trackMixpanelEvent(data: TrackEventData): Promise<void> {
    const { eventName, environmentId, eventProperties, userId } = data;

    // Get Posthog integration
    const integration = await this.prisma.integration.findFirst({
      where: {
        environmentId,
        code: 'mixpanel',
        enabled: true,
      },
    });

    if (!integration?.key) {
      throw new ParamsError('Mixpanel integration not configured for environment');
    }

    const endpoint =
      (integration?.config as { region?: string })?.region === 'EU'
        ? MIXPANEL_API_ENDPOINT_EU
        : MIXPANEL_API_ENDPOINT;

    const event = [
      {
        event: eventName,
        properties: {
          ...eventProperties,
          distinct_id: userId,
          token: integration.key,
          $insert_id: eventName,
        },
      },
    ];

    this.logger.debug(`Tracking event to Mixpanel: ${JSON.stringify(event)}`);

    await firstValueFrom(
      this.httpService.post(`${endpoint}/track`, event, {
        timeout: 5000,
        headers: {
          Authorization: `Bearer ${integration.key}`,
          'Content-Type': 'application/json',
        },
      }),
    );
  }

  async syncCohort(): Promise<void> {
    //
  }
}
