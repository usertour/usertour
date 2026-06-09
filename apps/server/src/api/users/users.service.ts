import { Injectable } from '@nestjs/common';

import { BizService } from '@/biz/biz.service';
import { UserNotFoundError } from '@/common/errors/errors';
import { Environment } from '@/environments/models/environment.model';

import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapUser } from './users.mapper';
import { GetUserQuery, ListUsersQuery, User, UserExpand } from './users.schema';

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
    const { limit, cursor, email, companyId, segmentId } = query;
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
        ),
      map: (node) => mapUser(node, expand),
    });
  }
}
