import { Injectable, Logger } from '@nestjs/common';
import { User } from '../models/user.model';
import { ConfigService } from '@nestjs/config';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { UpsertUserRequestDto } from './users.dto';
import { BizService } from '@/biz/biz.service';
import { ExpandType, ExpandTypes } from './users.dto';

@Injectable()
export class OpenAPIUsersService {
  private readonly logger = new Logger(OpenAPIUsersService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly bizService: BizService,
  ) {}

  async getUser(id: string, environmentId: string, expand?: ExpandTypes): Promise<User> {
    const bizUser = await this.bizService.getBizUser(id, environmentId, expand);

    if (!bizUser) {
      throw new OpenAPIException(
        OpenAPIErrors.USER.NOT_FOUND.message,
        HttpStatus.NOT_FOUND,
        OpenAPIErrors.USER.NOT_FOUND.code,
      );
    }

    return this.mapBizUserToUser(bizUser, expand);
  }

  async listUsers(
    environmentId: string,
    cursor?: string,
    limit = 20,
    expand?: ExpandTypes,
  ): Promise<{ results: User[]; next: string | null; previous: string | null }> {
    // Validate limit
    const pageSize = Number(limit) || 20;
    if (Number.isNaN(pageSize) || pageSize < 1) {
      throw new OpenAPIException(
        OpenAPIErrors.USER.INVALID_LIMIT.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.USER.INVALID_LIMIT.code,
      );
    }

    this.logger.debug(
      `Listing users with environmentId: ${environmentId}, cursor: ${cursor}, limit: ${pageSize}`,
    );

    const apiUrl = this.configService.get<string>('app.apiUrl');
    const { results, next, previous } = await this.bizService.listBizUsers(
      environmentId,
      cursor,
      pageSize,
      expand,
    );

    return {
      results: results.map((bizUser) => this.mapBizUserToUser(bizUser, expand)),
      next: next ? `${apiUrl}/v1/users?cursor=${next}` : null,
      previous: previous ? `${apiUrl}/v1/users?cursor=${previous}` : null,
    };
  }

  private mapBizUserToUser(bizUser: any, expand?: ExpandTypes): User {
    const memberships =
      expand?.includes(ExpandType.MEMBERSHIPS) || expand?.includes(ExpandType.MEMBERSHIPS_COMPANY)
        ? bizUser.bizUsersOnCompany?.map((membership) => ({
            id: membership.id,
            object: 'company_membership',
            attributes: membership.data || {},
            createdAt: membership.createdAt.toISOString(),
            companyId: membership.bizCompanyId,
            userId: membership.bizUserId,
            company: expand?.includes(ExpandType.MEMBERSHIPS_COMPANY)
              ? {
                  id: membership.bizCompany.externalId,
                  object: 'company',
                  attributes: membership.bizCompany.data || {},
                  createdAt: membership.bizCompany.createdAt.toISOString(),
                }
              : undefined,
          }))
        : null;

    return {
      id: bizUser.externalId,
      object: 'user',
      attributes: bizUser.data || {},
      createdAt: bizUser.createdAt.toISOString(),
      companies: expand?.includes(ExpandType.COMPANIES)
        ? bizUser.bizUsersOnCompany?.map((membership) => ({
            id: membership.bizCompany.externalId,
            object: 'company',
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
      throw new OpenAPIException(
        OpenAPIErrors.USER.INVALID_REQUEST.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.USER.INVALID_REQUEST.code,
      );
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
      object: 'user',
      deleted: true,
    };
  }
}
