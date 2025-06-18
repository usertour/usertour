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
    if (integration.find((i) => i.provider === 'amplitude')) {
      await this.amplitudeQueue.add('trackEvent', data);
    }
    if (integration.find((i) => i.provider === 'heap')) {
      await this.heapQueue.add('trackEvent', data);
    }
    // Only track HubSpot event if user has an email
    if (integration.find((i) => i.provider === 'hubspot' && userProperties?.email)) {
      // await this.hubspotQueue.add('trackEvent', data);
    }
    if (integration.find((i) => i.provider === 'posthog')) {
      await this.posthogQueue.add('trackEvent', data);
    }
    if (integration.find((i) => i.provider === 'mixpanel')) {
      await this.mixpanelQueue.add('trackEvent', data);
    }
    if (integration.find((i) => i.provider === 'segment')) {
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
   * @param provider - The provider of the integration
   * @returns The integration if found
   * @throws ParamsError if integration not found
   */
  async findOneIntegration(environmentId: string, provider: string) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        provider,
        environmentId,
      },
      include: {
        integrationOAuth: {
          select: {
            data: true,
          },
        },
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
   * @param provider - The provider of the integration
   * @param input - The update data
   * @returns The updated integration
   */
  async updateIntegration(environmentId: string, provider: string, input: UpdateIntegrationInput) {
    const updateData: any = {};
    if (input.enabled !== undefined) updateData.enabled = input.enabled;
    if (input.key !== undefined) updateData.key = input.key;
    if (input.config !== undefined) updateData.config = input.config;

    return this.prisma.integration.upsert({
      where: { environmentId_provider: { environmentId, provider } },
      update: updateData,
      create: {
        environmentId,
        provider,
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
        provider: 'amplitude',
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
        provider: 'heap',
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
        provider: 'hubspot',
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
        provider: 'posthog',
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
        provider: 'mixpanel',
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
        provider: 'segment',
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
  ): Promise<{ action: string; status: string; error?: { message: string; provider: number } }> {
    console.log('syncCohort', data);
    const { action, parameters } = data;
    const { mixpanel_cohort_name, members, mixpanel_cohort_id } = parameters;

    try {
      // Validate integration
      const integration = await this.prisma.integration.findFirst({
        where: {
          accessToken,
          provider: 'mixpanel',
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
          provider: error instanceof ParamsError ? 400 : 500,
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
   * @param provider - The integration provider ('salesforce' or 'salesforce-sandbox')
   * @returns The authorization URL
   */
  async getSalesforceAuthUrl(environmentId: string, provider: string) {
    const clientId = this.configService.get('integration.salesforce.clientId');
    const callbackUrl = this.configService.get('integration.salesforce.callbackUrl');
    const clientSecret = this.configService.get('integration.salesforce.clientSecret');
    const sandboxLoginUrl = this.configService.get('integration.salesforce.sandboxLoginUrl');
    const loginUrl = this.configService.get('integration.salesforce.loginUrl');

    if (!clientId || !callbackUrl || !clientSecret) {
      throw new ParamsError('Salesforce OAuth configuration not found');
    }

    if (provider !== 'salesforce' && provider !== 'salesforce-sandbox') {
      throw new ParamsError('Invalid integration provider');
    }

    const isSandbox = provider === 'salesforce-sandbox';

    // Create or get integration record
    const integration = await this.prisma.integration.upsert({
      where: {
        environmentId_provider: {
          environmentId,
          provider,
        },
      },
      create: {
        environmentId,
        provider,
        enabled: false,
        key: '',
        config: {},
      },
      update: {},
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
      this.logger.error({
        msg: 'Error in Salesforce OAuth callback',
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

    const isSandbox = integration.provider === 'salesforce-sandbox';

    const oauth2Config = {
      clientId,
      clientSecret,
      redirectUri: callbackUrl,
      loginUrl: isSandbox ? sandboxLoginUrl : loginUrl || undefined,
    };

    const oauth2 = new jsforce.OAuth2(oauth2Config);
    const conn = new jsforce.Connection({ oauth2 });

    try {
      const userInfo = await conn.authorize(code, {
        grant_type: 'authorization_code',
      });
      const { accessToken, refreshToken } = conn;

      // Fetch user details from Salesforce
      const userDetails = await conn.identity();
      const { email, username } = userDetails;

      // Fetch organization details
      const orgDetails = await conn.query<{ Name: string }>('SELECT Name FROM Organization');
      const organizationName = orgDetails.records[0]?.Name;

      // Update integration
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          enabled: true,
        },
      });

      const data = {
        email,
        username,
        organizationName,
        instanceUrl: conn.instanceUrl,
      };

      // Create or update OAuth configuration
      await this.prisma.integrationOAuth.upsert({
        where: { integrationId: integration.id },
        create: {
          integrationId: integration.id,
          provider: integration.provider,
          providerAccountId: userInfo.id,
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 7200 * 1000), // 2 hours from now
          scope: 'api refresh_token',
          data,
        },
        update: {
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 7200 * 1000),
          scope: 'api refresh_token',
          data,
        },
      });

      return integration;
    } catch (error) {
      this.logger.error({
        msg: 'Error in Salesforce OAuth callback',
        error: error.message,
        isSandbox,
        loginUrl: oauth2Config.loginUrl,
      });
      throw new ParamsError('Failed to authorize with Salesforce');
    }
  }

  /**
   * Disconnect an integration
   * @param environmentId - The ID of the environment
   * @param provider - The provider of the integration
   * @returns The disconnected integration
   */
  async disconnectIntegration(environmentId: string, provider: string) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        provider,
        environmentId,
      },
      include: {
        integrationOAuth: true,
      },
    });

    if (!integration) {
      throw new ParamsError('Integration not found');
    }

    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Delete OAuth configuration if exists
      if (integration.integrationOAuth) {
        await tx.integrationOAuth.delete({
          where: { integrationId: integration.id },
        });
      }

      // Update integration to disabled state
      return tx.integration.update({
        where: { id: integration.id },
        data: {
          enabled: false,
          key: '',
          config: {},
        },
      });
    });
  }

  /**
   * Get Salesforce object field lists
   * @param integrationId - The ID of the integration
   * @returns List of Salesforce object fields
   */
  async getSalesforceObjectFields(integrationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
      include: {
        integrationOAuth: true,
      },
    });

    if (!integration || !integration.integrationOAuth) {
      throw new ParamsError('Integration or OAuth configuration not found');
    }

    const { accessToken, refreshToken, data } = integration.integrationOAuth;
    const instanceUrl = data && typeof data === 'object' ? (data as any).instanceUrl : undefined;

    if (!instanceUrl) {
      throw new ParamsError(
        'Salesforce instance URL not found. Please reconnect your Salesforce integration.',
      );
    }

    const clientId = this.configService.get('integration.salesforce.clientId');
    const callbackUrl = this.configService.get('integration.salesforce.callbackUrl');
    const clientSecret = this.configService.get('integration.salesforce.clientSecret');

    const isSandbox = integration.provider === 'salesforce-sandbox';
    const loginUrl = isSandbox
      ? this.configService.get('integration.salesforce.sandboxLoginUrl')
      : this.configService.get('integration.salesforce.loginUrl');

    if (!clientId || !callbackUrl || !clientSecret || !loginUrl) {
      throw new ParamsError('Salesforce OAuth configuration is incomplete');
    }

    const oauth2 = new jsforce.OAuth2({
      clientId,
      clientSecret,
      redirectUri: callbackUrl,
      loginUrl,
    });

    const conn = new jsforce.Connection({
      oauth2,
      accessToken,
      refreshToken,
      instanceUrl,
    });

    // Get standard objects
    const standardObjects = ['Contact', 'Lead', 'Account', 'Opportunity'];
    const standardObjectsFields = await Promise.all(
      standardObjects.map(async (objectName) => {
        const describe = await conn.describe(objectName);
        return {
          name: objectName,
          label: describe.label,
          fields: describe.fields.map((field) => ({
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.nillable === false,
            unique: field.unique,
            referenceTo: field.referenceTo,
            picklistValues: field.picklistValues?.map((value) => ({
              label: value.label,
              value: value.value,
            })),
          })),
        };
      }),
    );

    // Get custom objects
    const customObjects = await conn.describeGlobal();
    const customObjectsFields = await Promise.all(
      customObjects.sobjects
        .filter((obj) => obj.custom)
        .map(async (obj) => {
          const describe = await conn.describe(obj.name);
          return {
            name: obj.name,
            label: obj.label,
            fields: describe.fields.map((field) => ({
              name: field.name,
              label: field.label,
              type: field.type,
              required: field.nillable === false,
              unique: field.unique,
              referenceTo: field.referenceTo,
              picklistValues: field.picklistValues?.map((value) => ({
                label: value.label,
                value: value.value,
              })),
            })),
          };
        }),
    );

    return {
      standardObjects: standardObjectsFields,
      customObjects: customObjectsFields.filter(Boolean), // Remove null entries
    };
  }
}
