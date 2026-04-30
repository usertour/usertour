import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateAttributeInput, UpdateAttributeInput } from './dto/attribute.input';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Prisma } from '@prisma/client';
import { ProjectCacheService } from '@/shared/project-cache.service';

@Injectable()
export class AttributesService {
  constructor(
    private prisma: PrismaService,
    private readonly cache: ProjectCacheService,
  ) {}

  async create(data: CreateAttributeInput) {
    const created = await this.prisma.attribute.create({ data });
    this.cache.invalidateDeferred(this.cache.keys.attrs(created.projectId));
    return created;
  }

  async update(data: UpdateAttributeInput) {
    const { id, ...others } = data;
    const updated = await this.prisma.attribute.update({
      where: { id },
      data: { ...others },
    });
    this.cache.invalidateDeferred(this.cache.keys.attrs(updated.projectId));
    return updated;
  }

  async delete(id: string) {
    const deleted = await this.prisma.attribute.delete({
      where: { id },
    });
    this.cache.invalidateDeferred(this.cache.keys.attrs(deleted.projectId));
    return deleted;
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
