import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Injectable } from '@nestjs/common';
import { Prisma, type Environment as PrismaEnvironment } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

import { EnvironmentNotFoundError } from '@/common/errors/errors';

import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapEnvironment } from './environments.mapper';
import { Environment, ListEnvironmentsQuery } from './environments.schema';

/**
 * v2 environments handler — read-only. Environments are project-level; lists are
 * cursor-paginated like the other v2 lists. Goes straight to Prisma (no domain
 * service needed for a flat read).
 */
@Injectable()
export class ApiEnvironmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    requestUrl: string,
    projectId: string,
    query: ListEnvironmentsQuery,
  ): Promise<{ results: Environment[]; next: string | null; previous: string | null }> {
    const { limit, cursor } = query;
    const orderByInput = Array.isArray(query.orderBy)
      ? query.orderBy
      : query.orderBy
        ? [query.orderBy]
        : ['createdAt'];
    const orderBy = parseOrderBy(orderByInput) as Prisma.EnvironmentOrderByWithRelationInput[];
    const where: Prisma.EnvironmentWhereInput = { projectId, deleted: false };

    return paginate({
      requestUrl,
      cursor,
      limit,
      fetch: (params) =>
        findManyCursorConnection<PrismaEnvironment, Prisma.EnvironmentWhereUniqueInput>(
          (args) => this.prisma.environment.findMany({ where, orderBy, ...args }),
          () => this.prisma.environment.count({ where }),
          params,
        ),
      map: (row) => mapEnvironment(row),
    });
  }

  async get(id: string, projectId: string): Promise<Environment> {
    const env = await this.prisma.environment.findFirst({
      where: { id, projectId, deleted: false },
    });
    if (!env) {
      throw new EnvironmentNotFoundError();
    }
    return mapEnvironment(env);
  }
}
