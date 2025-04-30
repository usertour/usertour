import { Injectable, Logger } from '@nestjs/common';
import { User } from '../models/user.model';
import { ConfigService } from '@nestjs/config';
import { UserNotFoundError, InvalidLimitError, InvalidRequestError } from '@/common/errors/errors';
import { UpsertUserRequestDto } from './users.dto';
import { BizService } from '@/biz/biz.service';
import { ExpandType, ExpandTypes } from './users.dto';
import { OpenApiObjectType } from '@/common/openapi/types';
import { paginate } from '@/common/openapi/pagination';

@Injectable()
export class OpenAPIUsersService {
  private readonly logger = new Logger(OpenAPIUsersService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly bizService: BizService,
  ) {}

  async getUser(id: string, environmentId: string, expand?: ExpandTypes): Promise<User> {
    const bizUser = await this.bizService.getBizUser(id, environmentId, { companies: true });

    if (!bizUser) {
      throw new UserNotFoundError();
    }

    return this.mapBizUserToUser(bizUser, expand);
  }

  async listUsers(
    environmentId: string,
    limit = 20,
    cursor?: string,
    expand?: ExpandTypes,
  ): Promise<{ results: User[]; next: string | null; previous: string | null }> {
    if (Number.isNaN(limit) || limit < 1) {
      throw new InvalidLimitError();
    }

    const apiUrl = this.configService.get<string>('app.apiUrl');
    const endpointUrl = `${apiUrl}/v1/users`;
    const include = {
      companies: expand?.includes(ExpandType.COMPANIES) ?? false,
      bizUsersOnCompany: expand?.includes(ExpandType.MEMBERSHIPS) ?? false,
    };

    return paginate(
      endpointUrl,
      cursor,
      limit,
      async (params) => this.bizService.listBizUsersWithRelations(environmentId, params, include),
      (node) => this.mapBizUserToUser(node, expand),
      expand ? { expand } : {},
    );
  }

  private mapBizUserToUser(bizUser: any, expand?: ExpandTypes): User {
    const memberships =
      expand?.includes(ExpandType.MEMBERSHIPS) || expand?.includes(ExpandType.MEMBERSHIPS_COMPANY)
        ? bizUser.bizUsersOnCompany?.map((membership) => ({
            id: membership.id,
            object: OpenApiObjectType.COMPANY_MEMBERSHIP,
            attributes: membership.data || {},
            createdAt: membership.createdAt.toISOString(),
            companyId: membership.bizCompanyId,
            userId: membership.bizUserId,
            company: expand?.includes(ExpandType.MEMBERSHIPS_COMPANY)
              ? {
                  id: membership.bizCompany.externalId,
                  object: OpenApiObjectType.COMPANY,
                  attributes: membership.bizCompany.data || {},
                  createdAt: membership.bizCompany.createdAt.toISOString(),
                }
              : undefined,
          }))
        : null;

    return {
      id: bizUser.externalId,
      object: OpenApiObjectType.USER,
      attributes: bizUser.data || {},
      createdAt: bizUser.createdAt.toISOString(),
      companies: expand?.includes(ExpandType.COMPANIES)
        ? bizUser.bizUsersOnCompany?.map((membership) => ({
            id: membership.bizCompany.externalId,
            object: OpenApiObjectType.COMPANY,
            attributes: membership.bizCompany.data || {},
            createdAt: membership.bizCompany.createdAt.toISOString(),
          }))
        : null,
      memberships,
    };
  }

  async upsertUser(data: UpsertUserRequestDto, environmentId: string): Promise<User> {
    const id = data.id;
    // Validate that only one of companies or memberships is set
    if (data.companies && data.memberships) {
      throw new InvalidRequestError();
    }

    const user = await this.bizService.upsertUser(id, data, environmentId);
    return this.getUser(user.externalId, environmentId);
  }

  async deleteUser(
    id: string,
    environmentId: string,
  ): Promise<{ id: string; object: string; deleted: boolean }> {
    await this.bizService.deleteBizUser([id], environmentId);
    return {
      id,
      object: OpenApiObjectType.USER,
      deleted: true,
    };
  }
}
