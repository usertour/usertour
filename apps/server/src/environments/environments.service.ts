import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateEnvironmentInput, UpdateEnvironmentInput } from './dto/environment.input';
import { ParamsError } from '@/common/errors';

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
}
