import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_AMPLITUDE_EVENT } from '@/common/consts/queen';
import { PrismaService } from 'nestjs-prisma';
import { UpdateIntegrationInput } from './integration.dto';
import { ParamsError } from '@/common/errors';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectQueue(QUEUE_AMPLITUDE_EVENT) private amplitudeQueue: Queue,
    private prisma: PrismaService,
  ) {}

  /**
   * Track an event to the integration
   * @param data - The event data
   * @returns The event data
   */
  async trackEvent(data: any): Promise<any> {
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
      return;
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
}
