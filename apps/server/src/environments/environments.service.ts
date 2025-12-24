import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateEnvironmentInput, UpdateEnvironmentInput } from './dto/environment.input';
import {
  LastEnvironmentCannotBeDeletedError,
  ParamsError,
  PrimaryEnvironmentCannotBeDeletedError,
} from '@/common/errors';
import { CreateAccessTokenInput } from './dto/access-token.dto';

@Injectable()
export class EnvironmentsService {
  constructor(private prisma: PrismaService) {}

  async create(newData: CreateEnvironmentInput) {
    return await this.prisma.$transaction(async (tx) => {
      // Check if there's already a primary environment in the project
      const primaryEnvCount = await tx.environment.count({
        where: {
          projectId: newData.projectId,
          isPrimary: true,
          deleted: false,
        },
      });

      // If no primary environment exists, set this one as primary
      const isPrimary = primaryEnvCount === 0;

      return await tx.environment.create({
        data: {
          ...newData,
          isPrimary,
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
    });
  }

  async update(input: UpdateEnvironmentInput) {
    return await this.prisma.$transaction(async (tx) => {
      const env = await tx.environment.findUnique({
        where: { id: input.id },
      });
      if (!env) {
        throw new ParamsError();
      }

      const updateData: { name: string; isPrimary?: boolean } = {
        name: input.name,
      };

      // If isPrimary is being set to true, ensure no other environment is primary
      if (input.isPrimary === true) {
        // Unset primary flag from other environments in the same project
        await tx.environment.updateMany({
          where: {
            projectId: env.projectId,
            id: { not: env.id },
            isPrimary: true,
            deleted: false,
          },
          data: { isPrimary: false },
        });
        updateData.isPrimary = true;
      } else if (input.isPrimary === false) {
        // Allow setting to false regardless of whether there are other primary environments
        // Projects can exist without a primary environment
        // Only update if current environment is actually primary
        if (env.isPrimary === true) {
          updateData.isPrimary = false;
        }
        // If current environment is not primary, ignore the request (don't update isPrimary field)
      }

      return await tx.environment.update({
        where: { id: env.id },
        data: updateData,
      });
    });
  }

  async delete(id: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Get the environment to find its projectId
      const environment = await tx.environment.findUnique({
        where: { id },
      });

      if (!environment) {
        throw new ParamsError();
      }

      // Check if this is the primary environment
      if (environment.isPrimary) {
        throw new PrimaryEnvironmentCannotBeDeletedError();
      }

      // Check if there is only one environment in the project
      const environmentCount = await tx.environment.count({
        where: {
          projectId: environment.projectId,
          deleted: false,
        },
      });

      if (environmentCount <= 1) {
        throw new LastEnvironmentCannotBeDeletedError();
      }

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
