import { Injectable, Logger } from '@nestjs/common';
import { Company } from '../models/company.model';
import { BizService } from '@/biz/biz.service';
import {
  UpsertCompanyRequestDto,
  CompanyExpandType,
  ListCompaniesQueryDto,
  GetCompanyQueryDto,
} from './companies.dto';
import { CompanyNotFoundError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/openapi/types';
import { paginate } from '@/common/openapi/pagination';
import { Environment } from '@/environments/models/environment.model';
import { parseOrderBy } from '@/common/openapi/sort';
import { DeleteResponseDto } from '@/common/openapi/dtos';

@Injectable()
export class OpenAPICompaniesService {
  private readonly logger = new Logger(OpenAPICompaniesService.name);

  constructor(private bizService: BizService) {}

  async getCompany(
    id: string,
    environment: Environment,
    query: GetCompanyQueryDto,
  ): Promise<Company> {
    const environmentId = environment.id;
    const { expand } = query;

    const include = {
      bizUsersOnCompany:
        expand?.length > 0
          ? {
              include: {
                bizUser: true,
              },
            }
          : false,
    };
    const bizCompany = await this.bizService.getBizCompany(id, environmentId, include);
    if (!bizCompany) {
      throw new CompanyNotFoundError();
    }
    return this.mapBizCompanyToCompany(bizCompany, expand);
  }

  async listCompanies(
    requestUrl: string,
    environment: Environment,
    query: ListCompaniesQueryDto,
  ): Promise<{ results: Company[]; next: string | null; previous: string | null }> {
    const { limit = 20, cursor, expand, orderBy } = query;

    const isIncludeBizUsersOnCompany =
      expand?.includes(CompanyExpandType.MEMBERSHIPS_USER) ||
      expand?.includes(CompanyExpandType.USERS);

    const include = {
      bizUsersOnCompany: {
        include: {
          bizUser: isIncludeBizUsersOnCompany,
        },
      },
    };
    const environmentId = environment.id;

    const sortOrders = parseOrderBy(orderBy || ['createdAt']);

    return paginate(
      requestUrl,
      cursor,
      limit,
      async (params) =>
        this.bizService.listBizCompanies(environmentId, params, include, sortOrders),
      (node) => this.mapBizCompanyToCompany(node, expand),
      expand ? { expand } : {},
    );
  }

  private mapBizCompanyToCompany(bizCompany: any, expand?: CompanyExpandType[]): Company {
    const memberships =
      expand?.includes(CompanyExpandType.MEMBERSHIPS) ||
      expand?.includes(CompanyExpandType.MEMBERSHIPS_USER)
        ? bizCompany.bizUsersOnCompany?.map((membership) => ({
            id: membership.id,
            object: OpenApiObjectType.COMPANY_MEMBERSHIP,
            attributes: membership.data || {},
            createdAt: membership.createdAt.toISOString(),
            companyId: membership.bizCompanyId,
            userId: membership.bizUserId,
            user: expand?.includes(CompanyExpandType.MEMBERSHIPS_USER)
              ? {
                  id: membership.bizUser.externalId,
                  object: OpenApiObjectType.USER,
                  attributes: membership.bizUser.data || {},
                  createdAt: membership.bizUser.createdAt.toISOString(),
                }
              : undefined,
          }))
        : null;

    return {
      id: bizCompany.externalId,
      object: OpenApiObjectType.COMPANY,
      attributes: bizCompany.data || {},
      createdAt: bizCompany.createdAt.toISOString(),
      users: expand?.includes(CompanyExpandType.USERS)
        ? bizCompany.bizUsersOnCompany?.map((membership) => ({
            id: membership.bizUser.externalId,
            object: OpenApiObjectType.USER,
            attributes: membership.bizUser.data || {},
            createdAt: membership.bizUser.createdAt.toISOString(),
          }))
        : null,
      memberships,
    };
  }

  async upsertCompany(
    data: UpsertCompanyRequestDto,
    environmentId: string,
    projectId: string,
  ): Promise<Company> {
    const id = data.id;

    // Upsert the company with attributes
    const company = await this.bizService.upsertBizCompany(
      projectId,
      environmentId,
      id,
      data.attributes || {},
    );

    if (!company) {
      throw new CompanyNotFoundError();
    }

    // Map the company to the response format
    return this.mapBizCompanyToCompany(company);
  }

  async deleteCompany(id: string, environmentId: string): Promise<DeleteResponseDto> {
    const bizCompany = await this.bizService.getBizCompany(id, environmentId);
    if (!bizCompany) {
      throw new CompanyNotFoundError();
    }
    await this.bizService.deleteBizCompany([bizCompany.id], environmentId);

    return {
      id,
      object: OpenApiObjectType.COMPANY,
      deleted: true,
    };
  }
}
