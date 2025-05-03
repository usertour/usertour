import { Injectable, Logger } from '@nestjs/common';
import { Company } from '../models/company.model';
import { BizService } from '@/biz/biz.service';
import { UpsertCompanyRequestDto, ExpandType, ExpandTypes, OrderByType } from './companies.dto';
import { CompanyNotFoundError, InvalidOrderByError } from '@/common/errors/errors';
import { OpenApiObjectType } from '@/common/openapi/types';
import { paginate } from '@/common/openapi/pagination';
import { Environment } from '@/environments/models/environment.model';
import { parseOrderBy } from '@/common/openapi/sort';

@Injectable()
export class OpenAPICompaniesService {
  private readonly logger = new Logger(OpenAPICompaniesService.name);

  constructor(private bizService: BizService) {}

  async getCompany(id: string, environmentId: string, expand?: ExpandTypes): Promise<Company> {
    const bizCompany = await this.bizService.getBizCompany(id, environmentId, expand);
    if (!bizCompany) {
      throw new CompanyNotFoundError();
    }
    return this.mapBizCompanyToCompany(bizCompany, expand);
  }

  async listCompanies(
    requestUrl: string,
    environment: Environment,
    limit = 20,
    cursor?: string,
    expand?: ExpandType[],
    orderBy?: OrderByType[],
  ): Promise<{ results: Company[]; next: string | null; previous: string | null }> {
    // Validate orderBy values
    if (
      orderBy?.some((value) => {
        const field = value.startsWith('-') ? value.substring(1) : value;
        return field !== OrderByType.CREATED_AT;
      })
    ) {
      throw new InvalidOrderByError();
    }

    const isIncludeBizUsersOnCompany =
      expand?.includes(ExpandType.MEMBERSHIPS_USER) || expand?.includes(ExpandType.USERS);

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

  private mapBizCompanyToCompany(bizCompany: any, expand?: ExpandTypes): Company {
    const memberships =
      expand?.includes(ExpandType.MEMBERSHIPS) || expand?.includes(ExpandType.MEMBERSHIPS_USER)
        ? bizCompany.bizUsersOnCompany?.map((membership) => ({
            id: membership.id,
            object: OpenApiObjectType.COMPANY_MEMBERSHIP,
            attributes: membership.data || {},
            createdAt: membership.createdAt.toISOString(),
            companyId: membership.bizCompanyId,
            userId: membership.bizUserId,
            user: expand?.includes(ExpandType.MEMBERSHIPS_USER)
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
      users: expand?.includes(ExpandType.USERS)
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

  async deleteCompany(id: string, environmentId: string): Promise<void> {
    const bizCompany = await this.bizService.getBizCompany(id, environmentId);
    if (!bizCompany) {
      throw new CompanyNotFoundError();
    }
    await this.bizService.deleteBizCompany([bizCompany.id], environmentId);
  }
}
