import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateAttributeInput, UpdateAttributeInput } from './dto/attribute.input';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Prisma } from '@prisma/client';

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

  async listWithPagination(
    projectId: string,
    paginationArgs: {
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    },
    bizType?: number,
    eventName?: string[],
    orderBy?: Prisma.AttributeOrderByWithRelationInput[],
  ) {
    const where: Prisma.AttributeWhereInput = {
      projectId,
      deleted: false,
      ...(bizType && { bizType }),
      ...(eventName && { attributeOnEvent: { some: { event: { codeName: { in: eventName } } } } }),
    };

    const baseQuery = {
      where,
      orderBy,
    };

    return findManyCursorConnection(
      (args) => this.prisma.attribute.findMany({ ...baseQuery, ...args }),
      () => this.prisma.attribute.count({ where: baseQuery.where }),
      paginationArgs,
    );
  }
}
