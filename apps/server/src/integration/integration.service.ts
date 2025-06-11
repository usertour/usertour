import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_AMPLITUDE_EVENT,
  QUEUE_HEAP_EVENT,
  QUEUE_HUBSPOT_EVENT,
  QUEUE_MIXPANEL_EVENT,
  QUEUE_POSTHOG_EVENT,
  QUEUE_SEGMENT_EVENT,
} from '@/common/consts/queen';
import { PrismaService } from 'nestjs-prisma';
import { MixpanelWebhookDto, UpdateIntegrationInput } from './integration.dto';
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
  SEGMENT_API_ENDPOINT,
  SEGMENT_API_ENDPOINT_EU,
} from '@/common/consts/endpoint';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { TrackEventData } from '@/common/types/track';
import { BizService } from '@/biz/biz.service';
import { IntegrationSource } from '@/common/types/integration';
import { Segment } from '@prisma/client';
import { CreateIntegrationOAuthInput, UpdateIntegrationOAuthInput } from './integration.dto';
import * as jsforce from 'jsforce';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectQueue(QUEUE_AMPLITUDE_EVENT) private amplitudeQueue: Queue,
    @InjectQueue(QUEUE_HEAP_EVENT) private heapQueue: Queue,
    @InjectQueue(QUEUE_HUBSPOT_EVENT) private hubspotQueue: Queue,
    @InjectQueue(QUEUE_POSTHOG_EVENT) private posthogQueue: Queue,
    @InjectQueue(QUEUE_MIXPANEL_EVENT) private mixpanelQueue: Queue,
    @InjectQueue(QUEUE_SEGMENT_EVENT) private segmentQueue: Queue,
    private prisma: PrismaService,
    private httpService: HttpService,
    private bizService: BizService,
    private configService: ConfigService,
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
    if (integration.find((i) => i.code === 'segment')) {
      await this.segmentQueue.add('trackEvent', data);
    }
  }

  /**
   * Find all integration for a given environment
   * @param environmentId - The ID of the environment
   * @returns List of integration
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

  async trackSegmentEvent(data: TrackEventData): Promise<void> {
    const { eventName, environmentId, eventProperties, userId } = data;

    // Get Segment integration
    const integration = await this.prisma.integration.findFirst({
      where: {
        environmentId,
        code: 'segment',
        enabled: true,
      },
    });

    if (!integration?.key) {
      throw new ParamsError('Segment integration not configured for environment');
    }

    const endpoint =
      (integration?.config as { region?: string })?.region === 'EU'
        ? SEGMENT_API_ENDPOINT_EU
        : SEGMENT_API_ENDPOINT;

    const event = {
      event: eventName,
      properties: eventProperties,
      userId,
      timestamp: new Date().toISOString(),
      writeKey: integration.key,
    };

    this.logger.debug(`Tracking event to Segment: ${JSON.stringify(event)}`);

    await firstValueFrom(
      this.httpService.post(`${endpoint}/v1/track`, event, {
        timeout: 5000,
      }),
    );
  }

  private async getOrCreateSegment(
    projectId: string,
    name: string,
    sourceId: string,
    source: IntegrationSource,
  ) {
    const segment = await this.bizService.findSegmentBySource(projectId, source, sourceId);
    if (segment) {
      return segment;
    }
    return await this.bizService.createUserSegmentWithSource(projectId, name, source, sourceId);
  }

  private async processMember(
    member: any,
    config: { mixpanelUserIdProperty: string },
    environmentId: string,
    segment: Segment,
    action: 'add' | 'remove',
  ) {
    const userId = member[config.mixpanelUserIdProperty];
    if (!userId) {
      this.logger.warn('Skipping member without userId property');
      return;
    }

    if (action === 'add') {
      const { [config.mixpanelUserIdProperty]: externalUserId, ...attributes } = member;
      const bizUser = await this.bizService.upsertUser(externalUserId, environmentId, attributes);
      if (bizUser) {
        await this.bizService.createBizUserOnSegment([
          {
            segmentId: segment.id,
            bizUserId: bizUser.id,
            data: {},
          },
        ]);
      }
    } else {
      const bizUser = await this.bizService.getBizUser(userId, environmentId);
      if (bizUser) {
        await this.bizService.deleteBizUserOnSegment({
          segmentId: segment.id,
          bizUserIds: [bizUser.id],
        });
      }
    }
  }

  async syncCohort(
    accessToken: string,
    data: MixpanelWebhookDto,
  ): Promise<{ action: string; status: string; error?: { message: string; code: number } }> {
    console.log('syncCohort', data);
    const { action, parameters } = data;
    const { mixpanel_cohort_name, members, mixpanel_cohort_id } = parameters;

    try {
      // Validate integration
      const integration = await this.prisma.integration.findFirst({
        where: {
          accessToken,
          code: 'mixpanel',
          enabled: true,
        },
        include: {
          environment: true,
        },
      });

      const config = integration?.config as {
        mixpanelUserIdProperty: string;
        exportEvents?: boolean;
        syncCohorts?: boolean;
        region?: string;
      };
      const environmentId = integration?.environmentId;
      const projectId = integration?.environment?.projectId;

      if (!integration || !config?.mixpanelUserIdProperty || !config?.syncCohorts) {
        throw new ParamsError('Mixpanel integration not configured correctly');
      }

      this.logger.debug(
        `Processing Mixpanel cohort sync: ${action} for cohort ${mixpanel_cohort_name}`,
      );

      // Handle different actions
      switch (action) {
        case 'members':
        case 'add_members': {
          const segment = await this.getOrCreateSegment(
            projectId,
            mixpanel_cohort_name,
            mixpanel_cohort_id,
            IntegrationSource.MIXPANEL,
          );

          for (const member of members) {
            await this.processMember(member, config, environmentId, segment, 'add');
          }
          break;
        }

        case 'remove_members': {
          const segment = await this.bizService.findSegmentBySource(
            projectId,
            IntegrationSource.MIXPANEL,
            mixpanel_cohort_id,
          );

          if (!segment) {
            this.logger.debug('Segment not found for remove_members action, skipping');
            return {
              action,
              status: 'success',
            };
          }

          for (const member of members) {
            await this.processMember(member, config, environmentId, segment, 'remove');
          }
          break;
        }

        default:
          throw new Error(`Unknown action type: ${action}`);
      }

      return {
        action,
        status: 'success',
      };
    } catch (error) {
      this.logger.error(`Error processing Mixpanel cohort sync: ${error.message}`, {
        error,
        action,
        parameters,
      });

      return {
        action,
        status: 'failure',
        error: {
          message: error.message,
          code: error instanceof ParamsError ? 400 : 500,
        },
      };
    }
  }

  /**
   * Create or update OAuth configuration for an integration
   * @param integrationId - The ID of the integration
   * @param input - The OAuth configuration data
   * @returns The created/updated OAuth configuration
   */
  async upsertIntegrationOAuth(integrationId: string, input: CreateIntegrationOAuthInput) {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new ParamsError('Integration not found');
    }

    return this.prisma.integrationOAuth.upsert({
      where: { integrationId },
      create: {
        integrationId,
        ...input,
      },
      update: input,
    });
  }

  /**
   * Get OAuth configuration for an integration
   * @param integrationId - The ID of the integration
   * @returns The OAuth configuration if found
   */
  async getIntegrationOAuth(integrationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new ParamsError('Integration not found');
    }

    return this.prisma.integrationOAuth.findUnique({
      where: { integrationId },
    });
  }

  /**
   * Update OAuth configuration for an integration
   * @param integrationId - The ID of the integration
   * @param input - The update data
   * @returns The updated OAuth configuration
   */
  async updateIntegrationOAuth(integrationId: string, input: UpdateIntegrationOAuthInput) {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new ParamsError('Integration not found');
    }

    return this.prisma.integrationOAuth.update({
      where: { integrationId },
      data: input,
    });
  }

  /**
   * Delete OAuth configuration for an integration
   * @param integrationId - The ID of the integration
   */
  async deleteIntegrationOAuth(integrationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new ParamsError('Integration not found');
    }

    await this.prisma.integrationOAuth.delete({
      where: { integrationId },
    });
  }

  /**
   * Get Salesforce OAuth authorization URL
   * @param environmentId - The ID of the environment
   * @param code - The integration code ('salesforce' or 'salesforce-sandbox')
   * @returns The authorization URL
   */
  async getSalesforceAuthUrl(environmentId: string, code: string) {
    const clientId = this.configService.get('integration.salesforce.clientId');
    const callbackUrl = this.configService.get('integration.salesforce.callbackUrl');
    const clientSecret = this.configService.get('integration.salesforce.clientSecret');
    const sandboxLoginUrl = this.configService.get('integration.salesforce.sandboxLoginUrl');
    const loginUrl = this.configService.get('integration.salesforce.loginUrl');

    if (!clientId || !callbackUrl || !clientSecret) {
      throw new ParamsError('Salesforce OAuth configuration not found');
    }

    if (code !== 'salesforce' && code !== 'salesforce-sandbox') {
      throw new ParamsError('Invalid integration code');
    }

    const isSandbox = code === 'salesforce-sandbox';

    // Create or get integration record
    const integration = await this.prisma.integration.upsert({
      where: {
        environmentId_code: {
          environmentId,
          code,
        },
      },
      create: {
        environmentId,
        code,
        enabled: false,
        key: '',
        config: {},
      },
      update: {
        enabled: false,
        key: '',
      },
    });

    const oauth2Config = {
      clientId,
      clientSecret,
      redirectUri: callbackUrl,
      loginUrl: isSandbox ? sandboxLoginUrl : loginUrl || undefined,
    };

    const oauth2 = new jsforce.OAuth2(oauth2Config);

    try {
      const authUrl = oauth2.getAuthorizationUrl({
        scope: 'api refresh_token',
        state: integration.id,
      });

      this.logger.debug('Generated Salesforce Auth URL:', {
        authUrl,
        isSandbox,
        loginUrl: oauth2Config.loginUrl,
      });

      return { url: authUrl };
    } catch (error) {
      this.logger.error('Failed to generate Salesforce auth URL:', {
        error: error.message,
        isSandbox,
        loginUrl: oauth2Config.loginUrl,
      });
      throw new ParamsError(
        `Failed to generate Salesforce auth URL. Please check your callback URL configuration: ${callbackUrl}. Error: ${error.message}`,
      );
    }
  }

  /**
   * Handle Salesforce OAuth callback
   * @param code - The authorization code
   * @param state - The integration ID
   * @returns The OAuth configuration
   */
  async handleSalesforceCallback(code: string, state: string) {
    const clientId = this.configService.get('integration.salesforce.clientId');
    const clientSecret = this.configService.get('integration.salesforce.clientSecret');
    const callbackUrl = this.configService.get('integration.salesforce.callbackUrl');
    const sandboxLoginUrl = this.configService.get('integration.salesforce.sandboxLoginUrl');
    const loginUrl = this.configService.get('integration.salesforce.loginUrl');

    if (!clientId || !clientSecret || !callbackUrl) {
      throw new ParamsError('Salesforce OAuth configuration not found');
    }

    // Get integration by ID
    const integration = await this.prisma.integration.findUnique({
      where: { id: state },
    });

    if (!integration) {
      throw new ParamsError('Integration not found');
    }

    const isSandbox = integration.code === 'salesforce-sandbox';

    const oauth2Config = {
      clientId,
      clientSecret,
      redirectUri: callbackUrl,
      loginUrl: isSandbox ? sandboxLoginUrl : loginUrl || undefined,
    };

    const oauth2 = new jsforce.OAuth2(oauth2Config);
    const conn = new jsforce.Connection({ oauth2 });

    try {
      const userInfo = await conn.authorize(code);
      const { accessToken, refreshToken } = conn;

      // Update integration
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          enabled: true,
        },
      });

      // Create or update OAuth configuration
      const oauth = await this.prisma.integrationOAuth.upsert({
        where: { integrationId: integration.id },
        create: {
          integrationId: integration.id,
          provider: integration.code,
          providerAccountId: userInfo.id,
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 7200 * 1000), // 2 hours from now
          scope: 'api refresh_token',
        },
        update: {
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 7200 * 1000),
          scope: 'api refresh_token',
        },
      });

      return oauth;
    } catch (error) {
      this.logger.error('Error in Salesforce OAuth callback:', {
        error: error.message,
        isSandbox,
        loginUrl: oauth2Config.loginUrl,
      });
      throw new ParamsError('Failed to authorize with Salesforce');
    }
  }
}
