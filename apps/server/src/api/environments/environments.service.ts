import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Injectable } from '@nestjs/common';
import { Prisma, type Environment as PrismaEnvironment } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

import {
  EnvironmentLimitError,
  EnvironmentNotFoundError,
  LastEnvironmentCannotBeDeletedError,
  PrimaryEnvironmentCannotBeDeletedError,
  ValidationError,
} from '@/common/errors/errors';
import { EnvironmentsService } from '@/environments/environments.service';

import { nameContains } from '../shared/filters';
import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapEnvironment } from './environments.mapper';
import {
  CreateEnvironmentBody,
  Environment,
  ListEnvironmentsQuery,
  UpdateEnvironmentBody,
} from './environments.schema';

/**
 * v2 environments handler — read-only. Environments are project-level; lists are
 * cursor-paginated like the other v2 lists. Goes straight to Prisma (no domain
 * service needed for a flat read).
 */
@Injectable()
export class ApiEnvironmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly environments: EnvironmentsService,
  ) {}

  async list(
    requestUrl: string,
    projectId: string,
    query: ListEnvironmentsQuery,
    allowedEnvironmentIds: string[] | null = null,
  ): Promise<{ results: Environment[]; next: string | null; previous: string | null }> {
    const { limit, cursor, name } = query;
    const orderBy = parseOrderBy(query.orderBy, [
      'createdAt',
    ]) as Prisma.EnvironmentOrderByWithRelationInput[];
    const nameFilter = nameContains(name);
    const where: Prisma.EnvironmentWhereInput = {
      projectId,
      deleted: false,
      ...(nameFilter ? { name: nameFilter } : {}),
    };

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
      map: (row) => mapEnvironment(row, allowedEnvironmentIds),
    });
  }

  async get(
    id: string,
    projectId: string,
    allowedEnvironmentIds: string[] | null = null,
  ): Promise<Environment> {
    const env = await this.prisma.environment.findFirst({
      where: { id, projectId, deleted: false },
    });
    if (!env) {
      throw new EnvironmentNotFoundError();
    }
    return mapEnvironment(env, allowedEnvironmentIds);
  }

  /** Create an environment in the project. The first env is made primary by the domain. */
  async create(
    projectId: string,
    body: CreateEnvironmentBody,
    allowedEnvironmentIds: string[] | null = null,
  ): Promise<Environment> {
    try {
      const env = await this.environments.create({ name: body.name, projectId });
      return mapEnvironment(env, allowedEnvironmentIds);
    } catch (error) {
      // Domain plan-limit error is a BaseError (renders 500); surface it as 400.
      if (error instanceof EnvironmentLimitError) {
        throw new ValidationError(error.getMessage('en'));
      }
      throw error;
    }
  }

  /** Rename an environment (isPrimary is intentionally not settable here). */
  async update(
    id: string,
    projectId: string,
    body: UpdateEnvironmentBody,
    allowedEnvironmentIds: string[] | null = null,
  ): Promise<Environment> {
    await this.get(id, projectId); // 404 if not in this project
    const env = await this.environments.update({ id, name: body.name });
    return mapEnvironment(env, allowedEnvironmentIds);
  }

  /** Delete an environment. The primary / last environment cannot be deleted. */
  async delete(id: string, projectId: string): Promise<void> {
    await this.get(id, projectId); // 404 if not in this project
    try {
      await this.environments.delete(id);
    } catch (error) {
      // Domain guards are BaseErrors (render 500); surface them as 400.
      if (
        error instanceof PrimaryEnvironmentCannotBeDeletedError ||
        error instanceof LastEnvironmentCannotBeDeletedError
      ) {
        throw new ValidationError(error.getMessage('en'));
      }
      throw error;
    }
  }
}
