import { Injectable } from '@nestjs/common';

import { BizService } from '@/biz/biz.service';
import { CompanyNotFoundError } from '@/common/errors/errors';

import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapCompany } from './companies.mapper';
import { Company, CompanyExpand, GetCompanyQuery, ListCompaniesQuery } from './companies.schema';

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * v2 companies handler (environment-scoped). Prisma->API mapping + the per-method
 * include logic are identical to the v1 facade (byte-for-byte parity); depends on
 * the domain {@link BizService}.
 */
@Injectable()
export class ApiCompaniesService {
  constructor(private readonly biz: BizService) {}

  async getCompany(id: string, environmentId: string, query: GetCompanyQuery): Promise<Company> {
    const expand = toArray<CompanyExpand>(query.expand);
    // v1: only load the membership rows (with their user) when expanding anything.
    const include = {
      bizUsersOnCompany: expand.length > 0 ? { include: { bizUser: true } } : false,
    };
    const bizCompany = await this.biz.getBizCompany(id, environmentId, include);
    if (!bizCompany) {
      throw new CompanyNotFoundError();
    }
    return mapCompany(bizCompany, expand);
  }

  async list(
    requestUrl: string,
    environmentId: string,
    query: ListCompaniesQuery,
  ): Promise<{ results: Company[]; next: string | null; previous: string | null }> {
    const { limit, cursor } = query;
    const expand = toArray<CompanyExpand>(query.expand);
    // v1: always load the membership rows; load the user only when needed.
    const includeBizUser = expand.includes('memberships.user') || expand.includes('users');
    const include = { bizUsersOnCompany: { include: { bizUser: includeBizUser } } };
    const orderBy = parseOrderBy(
      toArray(query.orderBy).length ? toArray(query.orderBy) : ['createdAt'],
    );

    return paginate({
      requestUrl,
      cursor,
      limit,
      query: { ...(expand.length ? { expand } : {}) },
      fetch: (params) => this.biz.listBizCompanies(environmentId, params, include, orderBy),
      map: (node) => mapCompany(node, expand),
    });
  }
}
