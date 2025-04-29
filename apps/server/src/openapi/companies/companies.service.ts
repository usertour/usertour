import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Company } from '../models/company.model';
import { ConfigService } from '@nestjs/config';
import { OpenAPIException } from '@/common/exceptions/openapi.exception';
import { OpenAPIErrors } from '../constants/errors';
import { BizService } from '../../biz/biz.service';
import { UpsertCompanyRequestDto, ExpandType, ExpandTypes } from './companies.dto';

@Injectable()
export class OpenAPICompaniesService {
  private readonly logger = new Logger(OpenAPICompaniesService.name);

  constructor(
    private configService: ConfigService,
    private bizService: BizService,
  ) {}

  async getCompany(id: string, environmentId: string, expand?: ExpandTypes): Promise<Company> {
    const bizCompany = await this.bizService.getBizCompany(id, environmentId, expand);
    return this.mapBizCompanyToCompany(bizCompany, expand);
  }

  async listCompanies(
    environmentId: string,
    cursor?: string,
    limit = 20,
    expand?: ExpandTypes,
  ): Promise<{ results: Company[]; next: string | null; previous: string | null }> {
    const { results, next, previous } = await this.bizService.listBizCompanies(
      environmentId,
      cursor,
      limit,
      expand,
    );

    const apiUrl = this.configService.get<string>('app.apiUrl');

    return {
      results: results.map((bizCompany) => this.mapBizCompanyToCompany(bizCompany, expand)),
      next: next ? `${apiUrl}/v1/companies?cursor=${next}` : null,
      previous: previous ? `${apiUrl}/v1/companies?cursor=${previous}` : null,
    };
  }

  private mapBizCompanyToCompany(bizCompany: any, expand?: ExpandTypes): Company {
    const memberships =
      expand?.includes(ExpandType.MEMBERSHIPS) || expand?.includes(ExpandType.MEMBERSHIPS_USER)
        ? bizCompany.bizUsersOnCompany?.map((membership) => ({
            id: membership.id,
            object: 'company_membership',
            attributes: membership.data || {},
            createdAt: membership.createdAt.toISOString(),
            companyId: membership.bizCompanyId,
            userId: membership.bizUserId,
            user: expand?.includes(ExpandType.MEMBERSHIPS_USER)
              ? {
                  id: membership.bizUser.externalId,
                  object: 'user',
                  attributes: membership.bizUser.data || {},
                  createdAt: membership.bizUser.createdAt.toISOString(),
                }
              : undefined,
          }))
        : null;

    return {
      id: bizCompany.externalId,
      object: 'company',
      attributes: bizCompany.data || {},
      createdAt: bizCompany.createdAt.toISOString(),
      users: expand?.includes(ExpandType.USERS)
        ? bizCompany.bizUsersOnCompany?.map((membership) => ({
            id: membership.bizUser.externalId,
            object: 'user',
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
      throw new OpenAPIException(
        OpenAPIErrors.COMMON.INTERNAL_SERVER_ERROR.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
        OpenAPIErrors.COMMON.INTERNAL_SERVER_ERROR.code,
      );
    }

    // Map the company to the response format
    return this.mapBizCompanyToCompany(company);
  }

  async deleteCompany(id: string, environmentId: string): Promise<void> {
    const bizCompany = await this.bizService.getBizCompany(id, environmentId);
    await this.bizService.deleteBizCompany([bizCompany.id], environmentId);
  }
}
