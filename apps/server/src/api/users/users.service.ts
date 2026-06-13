import { Injectable } from '@nestjs/common';

import { AttributeBizType } from '@/attributes/models/attribute.model';
import { BizService } from '@/biz/biz.service';
import { UserNotFoundError } from '@/common/errors/errors';
import { Environment } from '@/environments/models/environment.model';

import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapUser } from './users.mapper';
import { GetUserQuery, ListUsersQuery, UpsertUserBody, User, UserExpand } from './users.schema';

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

const USER_INCLUDE = { bizUsersOnCompany: { include: { bizCompany: true } } };

/**
 * v2 users handler (environment-scoped). The Prisma->API mapping is identical to
 * the v1 facade (byte-for-byte parity); depends on the domain {@link BizService}.
 */
@Injectable()
export class ApiUsersService {
  constructor(private readonly biz: BizService) {}

  async getUser(id: string, environmentId: string, query: GetUserQuery): Promise<User> {
    const expand = toArray<UserExpand>(query.expand);
    const bizUser = await this.biz.getBizUser(id, environmentId, USER_INCLUDE);
    if (!bizUser) {
      throw new UserNotFoundError();
    }
    return mapUser(bizUser, expand);
  }

  async list(
    requestUrl: string,
    environment: Environment,
    query: ListUsersQuery,
  ): Promise<{ results: User[]; next: string | null; previous: string | null }> {
    const { limit, cursor, email, companyId, segmentId, createdAfter, createdBefore } = query;
    const expand = toArray<UserExpand>(query.expand);
    const orderBy = parseOrderBy(
      toArray(query.orderBy).length ? toArray(query.orderBy) : ['createdAt'],
    );

    return paginate({
      requestUrl,
      cursor,
      limit,
      query: { ...(expand.length ? { expand } : {}) },
      fetch: (params) =>
        this.biz.listBizUsersWithRelations(
          environment.id,
          params,
          USER_INCLUDE,
          orderBy,
          email,
          companyId,
          segmentId,
          createdAfter,
          createdBefore,
        ),
      map: (node) => mapUser(node, expand),
    });
  }

  /** Upsert a user by external id (merges attributes), then return it. */
  async upsert(id: string, environment: Environment, body: UpsertUserBody): Promise<User> {
    // v2 is strict: a type-mismatched attribute value is rejected, not silently
    // dropped (the SDK identify path keeps the lenient drop-and-log).
    await this.biz.assertAttributeValueTypes(
      environment.id,
      AttributeBizType.USER,
      body.attributes,
    );
    await this.biz.upsertUser(id, environment.id, body.attributes ?? {});
    return this.getUser(id, environment.id, {});
  }

  /** Delete a user by external id. 404 when it doesn't exist. */
  async delete(id: string, environment: Environment): Promise<void> {
    const bizUser = await this.biz.getBizUser(id, environment.id);
    if (!bizUser) {
      throw new UserNotFoundError();
    }
    await this.biz.deleteBizUser([bizUser.id], environment.id);
  }
}
