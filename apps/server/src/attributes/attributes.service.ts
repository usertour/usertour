import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateAttributeInput, UpdateAttributeInput } from './dto/attribute.input';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Prisma } from '@prisma/client';
import { ProjectCacheService } from '@/shared/project-cache.service';
import { nameContains } from '@/api/shared/filters';
import { ResourceAlreadyExistsError } from '@/common/errors';

@Injectable()
export class AttributesService {
  constructor(
    private prisma: PrismaService,
    private readonly cache: ProjectCacheService,
  ) {}

  async create(data: CreateAttributeInput) {
    try {
      const created = await this.prisma.attribute.create({ data });
      await this.cache.invalidateDeferred(this.cache.keys.attrs(created.projectId));
      return created;
    } catch (err) {
      // (projectId, bizType, codeName) is unique — surface dup as typed
      // ResourceAlreadyExistsError instead of leaking the raw
      // PrismaClientKnownRequestError as a generic 500 ISE.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ResourceAlreadyExistsError();
      }
      throw err;
    }
  }

  async update(data: UpdateAttributeInput) {
    // codeName keys BizUser.data, so it is immutable after creation — strip any
    // incoming value so no caller (a raw GraphQL mutation included) can rename it
    // and orphan that data. v2 omits it and the builder disables the field; this
    // hard-enforces the invariant at the one chokepoint.
    const { id, codeName, ...others } = data;
    void codeName;
    const updated = await this.prisma.attribute.update({
      where: { id },
      data: { ...others },
    });
    await this.cache.invalidateDeferred(this.cache.keys.attrs(updated.projectId));
    return updated;
  }

  async delete(id: string) {
    // Clear AttributeOnEvent join rows before deleting the Attribute.
    // The relation has Prisma's default `onDelete: Restrict`, so a bare
    // `attribute.delete` throws P2003 the moment any event has tracked
    // this attribute. Mirrors what `events.service.ts.delete` already
    // does for the opposite side of the same join. Historical event
    // payloads keep their data — only the definition-layer link is
    // severed.
    const deleted = await this.prisma.$transaction(async (tx) => {
      await tx.attributeOnEvent.deleteMany({ where: { attributeId: id } });
      return await tx.attribute.delete({ where: { id } });
    });
    await this.cache.invalidateDeferred(this.cache.keys.attrs(deleted.projectId));
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
    name?: string,
  ) {
    const nameFilter = nameContains(name);
    const where: Prisma.AttributeWhereInput = {
      projectId,
      deleted: false,
      ...(bizType && { bizType }),
      ...(eventName && { attributeOnEvent: { some: { event: { codeName: { in: eventName } } } } }),
      // Match the machine `codeName` as well as the human `displayName`: callers (esp. MCP
      // agents) hold the codeName — it is what conditions, identify(), and diagnose use — so a
      // displayName-only filter silently returns nothing and reads as "attribute not defined".
      ...(nameFilter ? { OR: [{ codeName: nameFilter }, { displayName: nameFilter }] } : {}),
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
