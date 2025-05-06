import { Injectable, Logger } from '@nestjs/common';
import { User } from '../models/user.model';
import { UserNotFoundError } from '@/common/errors/errors';
import { UpsertUserRequestDto, UserOrderByType, GetUserQueryDto } from './users.dto';
import { BizService } from '@/biz/biz.service';
import { ExpandType, ExpandTypes } from './users.dto';
import { OpenApiObjectType } from '@/common/openapi/types';
import { paginate } from '@/common/openapi/pagination';
import { Environment } from '@/environments/models/environment.model';
import { parseOrderBy } from '@/common/openapi/sort';
import { ListUsersQueryDto } from './users.dto';
@Injectable()
export class OpenAPIUsersService {
  private readonly logger = new Logger(OpenAPIUsersService.name);

  constructor(private readonly bizService: BizService) {}

  async getUser(id: string, environmentId: string, query?: GetUserQueryDto): Promise<User> {
    const expand = query?.expand;
    const bizUser = await this.bizService.getBizUser(id, environmentId, {
      bizUsersOnCompany: {
        include: {
          bizCompany: true,
        },
      },
    });

    if (!bizUser) {
      throw new UserNotFoundError();
    }

    return this.mapBizUserToUser(bizUser, expand);
  }

  async listUsers(
    requestUrl: string,
    environment: Environment,
    query: ListUsersQueryDto,
  ): Promise<{ results: User[]; next: string | null; previous: string | null }> {
    const { limit = 20, expand, cursor, orderBy, email, companyId, segmentId } = query;

    const sortOrders = parseOrderBy(orderBy || [UserOrderByType.CREATED_AT]);

    const include = {
      bizUsersOnCompany: {
        include: {
          bizCompany: true,
        },
      },
    };
    const environmentId = environment.id;

    return paginate(
      requestUrl,
      cursor,
      limit,
      async (params) =>
        this.bizService.listBizUsersWithRelations(
          environmentId,
          params,
          include,
          sortOrders,
          email,
          companyId,
          segmentId,
        ),
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
    const user = await this.bizService.upsertUser(
      data.id,
      environmentId,
      data.attributes,
      data.companies,
      data.memberships,
    );
    return this.getUser(user.externalId, environmentId);
  }

  async deleteUser(
    id: string,
    environmentId: string,
  ): Promise<{ id: string; object: string; deleted: boolean }> {
    const bizUser = await this.bizService.getBizUser(id, environmentId);
    if (!bizUser) {
      throw new UserNotFoundError();
    }
    await this.bizService.deleteBizUser([bizUser.id], environmentId);
    return {
      id,
      object: OpenApiObjectType.USER,
      deleted: true,
    };
  }
}
