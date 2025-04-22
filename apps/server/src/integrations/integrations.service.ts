import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { UpsertBizIntegrationInput } from './dto/integration.input';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  async get(id: string) {
    return await this.prisma.integration.findUnique({
      where: { id },
    });
  }

  async listAllIntegrations(projectId: string) {
    const integrations = await this.prisma.integration.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    const bizIntegrations = await this.prisma.bizIntegration.findMany({
      where: {
        integrationId: {
          in: integrations.map((integration) => integration.id),
        },
      },
    });
    const bizIntegrationMap = bizIntegrations.reduce(
      (map, bizIntegration) => {
        map[bizIntegration.integrationId] = bizIntegration.enabled;
        return map;
      },
      {} as Record<string, boolean>,
    );

    return integrations.map((integration) => ({
      ...integration,
      enabled: bizIntegrationMap[integration.id] ?? false,
    }));
  }

  async upsertBizIntegration(data: UpsertBizIntegrationInput): Promise<boolean> {
    const { integrationId, enabled } = data;

    try {
      const existingIntegration = await this.prisma.bizIntegration.findFirst({
        where: { integrationId },
      });

      if (existingIntegration) {
        await this.prisma.bizIntegration.update({
          where: { id: existingIntegration.id },
          data: {
            enabled,
          },
        });
      } else {
        await this.prisma.bizIntegration.create({
          data: {
            integrationId,
            enabled,
          },
        });
      }

      return true;
    } catch (error) {
      console.error('Error in upsertBizIntegration:', error);
      return false;
    }
  }
}
