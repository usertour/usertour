import { Injectable } from '@nestjs/common';
import { toArray } from '../shared/query';

import { AttributeBizType } from '@/attributes/models/attribute.model';
import { BizService } from '@/biz/biz.service';
import {
  CompanyMembershipNotFoundError,
  CompanyNotFoundError,
  UserNotFoundError,
  ValidationError,
} from '@/common/errors/errors';
import { Environment } from '@/environments/models/environment.model';

import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapCompany } from './companies.mapper';
import {
  Company,
  CompanyExpand,
  CompanyMembership,
  GetCompanyQuery,
  ListCompaniesQuery,
  UpsertCompanyBody,
  UpsertMembershipBody,
} from './companies.schema';
import { mapMembership } from '../shared/biz-refs';

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
    environment: Environment,
    query: ListCompaniesQuery,
  ): Promise<{ results: Company[]; next: string | null; previous: string | null }> {
    const { limit, cursor, segmentId, createdAfter, createdBefore } = query;
    const expand = toArray<CompanyExpand>(query.expand);
    // Always load the membership rows; load the user for ANY expand — even the
    // plain memberships expand needs bizUser.externalId (v2 emits external ids
    // on memberships, unlike v1 which only loaded the user for user-shaped
    // expands). Mirrors the getCompany include above.
    const include = { bizUsersOnCompany: { include: { bizUser: expand.length > 0 } } };
    const orderBy = parseOrderBy(query.orderBy, ['createdAt']);

    // A foreign segmentId must 404, not silently apply another tenant's segment.
    if (segmentId) {
      await this.biz.assertSegmentInProject(segmentId, environment.projectId);
    }

    return paginate({
      requestUrl,
      cursor,
      limit,
      fetch: (params) =>
        this.biz.listBizCompanies(
          environment.id,
          params,
          include,
          orderBy,
          segmentId,
          createdAfter,
          createdBefore,
        ),
      map: (node) => mapCompany(node, expand),
    });
  }

  /** Upsert a company by external id (merges attributes), then return it. */
  async upsert(id: string, environment: Environment, body: UpsertCompanyBody): Promise<Company> {
    // Same rule as users.service.upsert: a blank external id creates a row no
    // id-keyed read/delete can ever address again.
    if (!id.trim()) {
      throw new ValidationError('Company external id must be a non-empty string.');
    }
    // v2 is strict: a type-mismatched attribute value is rejected, not silently
    // dropped (the SDK identify path keeps the lenient drop-and-log).
    await this.biz.assertAttributeValueTypes(
      environment.id,
      AttributeBizType.COMPANY,
      body.attributes,
    );
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
  ): Promise<CompanyMembership> {
    const bizCompany = await this.biz.getBizCompany(companyId, environment.id);
    if (!bizCompany) {
      throw new CompanyNotFoundError();
    }
    const bizUser = await this.biz.getBizUser(userId, environment.id);
    if (!bizUser) {
      throw new UserNotFoundError();
    }
    // v2 is strict: reject a type-mismatched membership attribute instead of
    // silently dropping it (mirrors the user/company upsert paths above).
    await this.biz.assertAttributeValueTypes(
      environment.id,
      AttributeBizType.MEMBERSHIP,
      body.attributes,
    );
    const membership = await this.biz.upsertBizCompanyMembership(
      environment.projectId,
      bizCompany.id,
      bizUser.id,
      body.attributes ?? {},
    );
    // Echo the membership itself (this was the ONLY write returning a bare
    // success) — with the EXTERNAL ids the v2 surface addresses by, not the
    // internal row ids.
    return mapMembership(membership, { companyId, userId }) as CompanyMembership;
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
