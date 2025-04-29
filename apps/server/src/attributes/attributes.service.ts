import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateAttributeInput, UpdateAttributeInput } from './dto/attribute.input';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';

@Injectable()
export class AttributesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateAttributeInput) {
    return await this.prisma.attribute.create({
      data,
    });
  }

  async update(data: UpdateAttributeInput) {
    const { id, ...others } = data;
    return await this.prisma.attribute.update({
      where: { id },
      data: { ...others },
    });
  }

  async delete(id: string) {
    return await this.prisma.attribute.delete({
      where: { id },
    });
  }

  async get(id: string) {
    return await this.prisma.attribute.findUnique({
      where: { id },
    });
  }

  async list(projectId: string, bizType: number) {
    if (bizType === 0) {
      return await this.prisma.attribute.findMany({
        where: { projectId },
        orderBy: { id: 'asc' },
      });
    }
    return await this.prisma.attribute.findMany({
      where: { projectId, bizType },
      orderBy: { id: 'asc' },
    });
  }

  async listWithPagination(projectId: string, cursor?: string, limit = 20) {
    return await findManyCursorConnection(
      (args) =>
        this.prisma.attribute.findMany({
          ...args,
          where: {
            projectId,
            deleted: false,
          },
          orderBy: { createdAt: 'desc' },
        }),
      () =>
        this.prisma.attribute.count({
          where: {
            projectId,
            deleted: false,
          },
        }),
      { first: limit, after: cursor },
    );
  }
}
