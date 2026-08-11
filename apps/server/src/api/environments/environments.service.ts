import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Injectable } from '@nestjs/common';
import { Prisma, type Environment as PrismaEnvironment } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

import {
  EnvironmentCreateRequiresFullScopeError,
  EnvironmentLimitError,
  EnvironmentNotFoundError,
  ValidationError,
} from '@/common/errors/errors';
import { EnvironmentsService } from '@/environments/environments.service';

import { nameContains } from '@/common/filters';
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

  /**
   * Assert an environment exists in the project (not soft-deleted), or 404 E1026.
   * Used to check existence BEFORE the token's env-scope check on the item routes,
   * so a non-existent id 404s (E1026) instead of masking as a scope error — a token
   * that manages this project may legitimately learn which of its envs exist.
   */
  async requireEnvironmentExists(id: string, projectId: string): Promise<void> {
    const env = await this.prisma.environment.findFirst({
      where: { id, projectId, deleted: false },
      select: { id: true },
    });
    if (!env) {
      throw new EnvironmentNotFoundError();
    }
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
    // A token restricted to an environment allowlist cannot act on the environment
    // it would create (the allowlist doesn't grow) — it'd be an undeletable orphan,
    // every follow-up op 403ing E1029. Refuse up front; creation needs a token
    // scoped to all environments. Rename/delete of an in-scope env stay allowed.
    if (allowedEnvironmentIds !== null) {
      throw new EnvironmentCreateRequiresFullScopeError();
    }
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

  /**
   * Delete an environment. The primary / last environment cannot be deleted —
   * those domain guards (E0023 / E0022) pass through as-is: the exception
   * filter's DOMAIN_ERROR_STATUS maps them to 409 state-conflicts (same family
   * as E1028/E1030/E1031), keeping their specific codes instead of squashing
   * them into a generic E1017 that told callers to "fix the request".
   */
  async delete(id: string, projectId: string): Promise<void> {
    await this.get(id, projectId); // 404 if not in this project
    await this.environments.delete(id);
  }
}
