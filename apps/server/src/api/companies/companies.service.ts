import { Injectable } from '@nestjs/common';

import { BizService } from '@/biz/biz.service';
import {
  CompanyMembershipNotFoundError,
  CompanyNotFoundError,
  UserNotFoundError,
} from '@/common/errors/errors';
import { Environment } from '@/environments/models/environment.model';

import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapCompany } from './companies.mapper';
import {
  Company,
  CompanyExpand,
  GetCompanyQuery,
  ListCompaniesQuery,
  UpsertCompanyBody,
  UpsertMembershipBody,
} from './companies.schema';

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
    const { limit, cursor, segmentId } = query;
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
      query: { ...(expand.length ? { expand } : {}), ...(segmentId ? { segmentId } : {}) },
      fetch: (params) =>
        this.biz.listBizCompanies(environmentId, params, include, orderBy, segmentId),
      map: (node) => mapCompany(node, expand),
    });
  }

  /** Upsert a company by external id (merges attributes), then return it. */
  async upsert(id: string, environment: Environment, body: UpsertCompanyBody): Promise<Company> {
    const company = await this.biz.upsertBizCompany(
      environment.projectId,
      environment.id,
      id,
      body.attributes ?? {},
    );
    if (!company) {
      throw new CompanyNotFoundError();
    }
    return mapCompany(company, []);
  }

  /** Delete a company by external id. 404 when it doesn't exist. */
  async delete(id: string, environment: Environment): Promise<void> {
    const bizCompany = await this.biz.getBizCompany(id, environment.id);
    if (!bizCompany) {
      throw new CompanyNotFoundError();
    }
    await this.biz.deleteBizCompany([bizCompany.id], environment.id);
  }

  /**
   * Upsert the membership linking a user to a company (both must already exist —
   * entities are created via their own upsert). Merges membership attributes.
   */
  async upsertMembership(
    companyId: string,
    userId: string,
    environment: Environment,
    body: UpsertMembershipBody,
  ): Promise<void> {
    const bizCompany = await this.biz.getBizCompany(companyId, environment.id);
    if (!bizCompany) {
      throw new CompanyNotFoundError();
    }
    const bizUser = await this.biz.getBizUser(userId, environment.id);
    if (!bizUser) {
      throw new UserNotFoundError();
    }
    await this.biz.upsertBizCompanyMembership(
      environment.projectId,
      bizCompany.id,
      bizUser.id,
      body.attributes ?? {},
    );
  }

  /** Remove the membership linking a user to a company. 404 when not linked. */
  async deleteMembership(
    companyId: string,
    userId: string,
    environment: Environment,
  ): Promise<void> {
    const row = await this.biz.getBizCompanyMembership(userId, companyId, environment.id);
    if (!row) {
      throw new CompanyMembershipNotFoundError();
    }
    await this.biz.deleteBizCompanyMembership(row.id);
  }
}
