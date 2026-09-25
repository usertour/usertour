import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import type { AttributeChanges } from '../types/attribute-changes.type';
import type { NewAttribute } from '../types/new-attribute.type';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Prisma } from '@prisma/client';
import { ProjectCacheService } from '@/modules/common/services/project-cache.service';
import { nameContains } from '@/modules/common/utils/query-filters.util';
import {
  AttributeCodeNameHeldByDeletedError,
  ParamsError,
  ResourceAlreadyExistsError,
  ValidationError,
} from '@/modules/common/errors/errors';
import { ReferencesService } from '@/modules/references/services/references.service';

@Injectable()
export class AttributesService {
  constructor(
    private prisma: PrismaService,
    private readonly cache: ProjectCacheService,
    private readonly references: ReferencesService,
  ) {}

  /**
   * A codeName stays reserved while its attribute is soft-deleted (ADR 0016), so
   * creating it again restores that row — every condition that referenced the
   * old id resolves again — instead of forking a new id. The data type must
   * match: conditions written against the old type would mis-evaluate.
   */
  async create(data: NewAttribute) {
    const held = await this.prisma.attribute.findUnique({
      where: {
        projectId_bizType_codeName: {
          projectId: data.projectId,
          bizType: data.bizType,
          codeName: data.codeName,
        },
      },
    });
    if (held?.deleted) {
      if (data.dataType !== held.dataType) {
        throw new AttributeCodeNameHeldByDeletedError(
          `"${data.codeName}" belongs to a deleted attribute of another data type. Restore that attribute or choose another codeName.`,
        );
      }
      const restored = await this.prisma.attribute.update({
        where: { id: held.id },
        data: {
          deleted: false,
          displayName: data.displayName,
          ...(data.description !== undefined ? { description: data.description } : {}),
        },
      });
      await this.cache.invalidateDeferred(this.cache.keys.attrs(restored.projectId));
      return restored;
    }
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

  async update(data: AttributeChanges) {
    // codeName keys BizUser.data, so it is immutable after creation. REFUSE a
    // rename instead of silently stripping it — a caller who believes the rename
    // succeeded starts sending data under the new code, auto-creating a second
    // attribute and splitting the data. Echoing the current value back (the
    // builder's edit form does) is allowed. v2 omits the field entirely.
    const { id, codeName, ...others } = data;
    const existing = await this.prisma.attribute.findUnique({
      where: { id },
      select: { codeName: true, source: true, dataType: true, bizType: true },
    });
    if (existing && codeName !== undefined && codeName !== existing.codeName) {
      throw new ValidationError(
        `codeName is immutable (it keys stored user/company data) — cannot rename "${existing.codeName}" to "${codeName}". Create a new attribute instead.`,
      );
    }
    // A provider-owned attribute (CRM sync, ADR 0013 §6) takes its shape from
    // the remote property; a type change here would break the next mapping
    // save and the values the sync writes. Labels and descriptions stay free.
    if (existing?.source && existing.source !== 'internal') {
      const reshaped =
        (others.dataType !== undefined && others.dataType !== existing.dataType) ||
        (others.bizType !== undefined && others.bizType !== existing.bizType);
      if (reshaped) {
        throw new ValidationError(
          `Attribute "${existing.codeName}" is synced from ${existing.source}; its type is set by the integration mapping.`,
        );
      }
    }
    const updated = await this.prisma.attribute.update({
      where: { id },
      data: { ...others },
    });
    await this.cache.invalidateDeferred(this.cache.keys.attrs(updated.projectId));
    return updated;
  }

  async delete(id: string) {
    // Predefined (system) attributes must never be deleted. Enforce it here at the
    // shared chokepoint so NO caller can bypass it — the v2 API pre-checks, but a
    // raw GraphQL `deleteAttribute` mutation calls this directly. Mirrors how
    // `update` above hard-enforces the immutable codeName at this same layer.
    const existing = await this.prisma.attribute.findUnique({ where: { id } });
    if (existing?.predefined) {
      throw new ValidationError('Cannot delete a predefined attribute definition.');
    }
    // Provider-owned attributes (CRM sync, ADR 0013 §6) are released by the
    // mapping, never deleted underneath it — the next identify would recreate
    // the definition as internal and the ownership guard would be gone.
    if (existing?.source && existing.source !== 'internal') {
      throw new ValidationError(
        `Attribute "${existing.codeName}" is synced from ${existing.source}; remove it from the integration mapping first.`,
      );
    }
    if (!existing || existing.deleted) {
      throw new ParamsError();
    }
    // Soft delete (ADR 0016): the row and its AttributeOnEvent links stay, so
    // stored conditions still decompile to a codeName and restoring brings the
    // attribute back whole. Refused while a live surface still uses it.
    await this.references.assertUnreferenced(existing.projectId, 'attribute', id);
    const deleted = await this.prisma.attribute.update({
      where: { id },
      data: { deleted: true },
    });
    await this.cache.invalidateDeferred(this.cache.keys.attrs(deleted.projectId));
    return deleted;
  }

  /** Bring a soft-deleted attribute back as it was. Idempotent on a live one. */
  async restore(id: string) {
    const existing = await this.prisma.attribute.findUnique({ where: { id } });
    if (!existing) {
      throw new ParamsError();
    }
    if (!existing.deleted) {
      return existing;
    }
    const restored = await this.prisma.attribute.update({
      where: { id },
      data: { deleted: false },
    });
    await this.cache.invalidateDeferred(this.cache.keys.attrs(restored.projectId));
    return restored;
  }

  async get(id: string) {
    return await this.prisma.attribute.findUnique({
      where: { id },
    });
  }

  async list(projectId: string, bizType: number) {
    if (bizType === 0) {
      return await this.prisma.attribute.findMany({
        where: { projectId, deleted: false },
        orderBy: { id: 'asc' },
      });
    }
    return await this.prisma.attribute.findMany({
      where: { projectId, bizType, deleted: false },
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
    deleted = false,
  ) {
    const nameFilter = nameContains(name);
    const where: Prisma.AttributeWhereInput = {
      projectId,
      deleted,
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
