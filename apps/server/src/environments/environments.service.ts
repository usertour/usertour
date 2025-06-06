import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateEnvironmentInput, UpdateEnvironmentInput } from './dto/environment.input';
import { ParamsError } from '@/common/errors';
import { CreateAccessTokenInput } from './dto/access-token.dto';

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
    return await this.prisma.$transaction(async (tx) => {
      // Check if there are any ContentOnEnvironment records
      const contentCount = await tx.contentOnEnvironment.count({
        where: { environmentId: id },
      });

      // Only delete ContentOnEnvironment records if they exist
      if (contentCount > 0) {
        await tx.contentOnEnvironment.deleteMany({
          where: { environmentId: id },
        });
      }

      // Update environment to mark as deleted
      return await tx.environment.update({
        where: { id },
        data: { deleted: true },
      });
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
}
