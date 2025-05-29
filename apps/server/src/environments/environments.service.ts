import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateEnvironmentInput, UpdateEnvironmentInput } from './dto/environment.input';
import { ParamsError } from '@/common/errors';
import { CreateAccessTokenInput } from './dto/access-token.dto';
import { UpdateIntegrationInput } from './dto/integration.dto';

@Injectable()
export class EnvironmentsService {
  constructor(private prisma: PrismaService) {}

  async create(newData: CreateEnvironmentInput) {
    return await this.prisma.environment.create({
      data: {
        ...newData,
        segments: {
          create: [
            {
              name: 'All Users',
              bizType: SegmentBizType.USER,
              dataType: SegmentDataType.ALL,
              data: [],
            },
            {
              name: 'All Companies',
              bizType: SegmentBizType.COMPANY,
              dataType: SegmentDataType.ALL,
              data: [],
            },
          ],
        },
      },
    });
  }

  async update(input: UpdateEnvironmentInput) {
    const env = await this.prisma.environment.findUnique({
      where: { id: input.id },
    });
    if (!env) {
      throw new ParamsError();
    }
    return await this.prisma.environment.update({
      where: { id: env.id },
      data: { name: input.name },
    });
  }

  async delete(id: string) {
    return await this.prisma.environment.update({
      where: { id },
      data: { deleted: true },
    });
  }

  async get(id: string) {
    return await this.prisma.environment.findUnique({
      where: { id },
    });
  }

  async listEnvsByProjectId(projectId: string) {
    return await this.prisma.environment.findMany({
      where: { projectId, deleted: false },
      orderBy: { createdAt: 'asc' },
    });
  }

  // AccessToken related methods
  async createAccessToken(environmentId: string, input: CreateAccessTokenInput) {
    return this.prisma.accessToken.create({
      data: {
        name: input.name,
        description: input.description,
        environmentId,
        isActive: true,
      },
    });
  }

  async findAllAccessTokens(environmentId: string) {
    return this.prisma.accessToken.findMany({
      where: {
        environmentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneAccessToken(environmentId: string, id: string) {
    const accessToken = await this.prisma.accessToken.findUnique({
      where: { id, environmentId },
    });

    if (!accessToken) {
      throw new ParamsError('Access token not found');
    }

    return accessToken;
  }

  async removeAccessToken(environmentId: string, id: string) {
    await this.findOneAccessToken(environmentId, id);

    return this.prisma.accessToken.delete({
      where: { id },
    });
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
