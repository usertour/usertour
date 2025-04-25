import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Company } from '../models/company.model';
import { ConfigService } from '@nestjs/config';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { OpenAPIErrors } from '../constants/errors';
import { BizService } from '../../biz/biz.service';
import { UpsertCompanyRequestDto, ExpandType, ExpandTypes } from './company.dto';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private bizService: BizService,
  ) {}

  async getCompany(id: string, environmentId: string, expand?: ExpandTypes): Promise<Company> {
    const bizCompany = await this.prisma.bizCompany.findFirst({
      where: {
        externalId: id,
        environmentId,
      },
      include: {
        bizUsersOnCompany:
          expand?.length > 0
            ? {
                include: {
                  bizUser: true,
                },
              }
            : false,
      },
    });
    console.log(bizCompany);

    if (!bizCompany) {
      throw new OpenAPIException(
        OpenAPIErrors.COMPANY.NOT_FOUND.message,
        HttpStatus.NOT_FOUND,
        OpenAPIErrors.COMPANY.NOT_FOUND.code,
      );
    }

    return this.mapBizCompanyToCompany(bizCompany, expand);
  }

  async listCompanies(
    environmentId: string,
    cursor?: string,
    limit = 20,
    expand?: ExpandTypes,
  ): Promise<{ results: Company[]; next: string | null; previous: string | null }> {
    // Validate limit
    const pageSize = Number(limit) || 20;
    if (Number.isNaN(pageSize) || pageSize < 1) {
      throw new OpenAPIException(
        OpenAPIErrors.COMPANY.INVALID_LIMIT.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.COMPANY.INVALID_LIMIT.code,
      );
    }

    this.logger.debug(
      `Listing companies with environmentId: ${environmentId}, cursor: ${cursor}, limit: ${pageSize}`,
    );

    const apiUrl = this.configService.get<string>('app.apiUrl');
    const baseQuery = {
      where: { environmentId },
      include: {
        bizUsersOnCompany:
          expand?.length > 0
            ? {
                include: {
                  bizUser: true,
                },
              }
            : false,
      },
    };

    // Get the previous page's last cursor if we're not on the first page
    let previousPage = null;
    if (cursor) {
      try {
        previousPage = await findManyCursorConnection(
          (args) => this.prisma.bizCompany.findMany({ ...baseQuery, ...args }),
          () => this.prisma.bizCompany.count({ where: { environmentId } }),
          { last: pageSize, before: cursor },
        );
      } catch (error) {
        this.logger.warn(`Failed to get previous page: ${error.message}`);
        throw new OpenAPIException(
          OpenAPIErrors.COMPANY.INVALID_CURSOR_PREVIOUS.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.COMPANY.INVALID_CURSOR_PREVIOUS.code,
        );
      }
    }

    let connection: any;
    try {
      connection = await findManyCursorConnection(
        (args) => this.prisma.bizCompany.findMany({ ...baseQuery, ...args }),
        () => this.prisma.bizCompany.count({ where: { environmentId } }),
        { first: pageSize, after: cursor },
      );
    } catch (error) {
      this.logger.error(`Failed to get current page: ${error.message}`);
      throw new OpenAPIException(
        OpenAPIErrors.COMPANY.INVALID_CURSOR.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.COMPANY.INVALID_CURSOR.code,
      );
    }

    // If we got no results and there was a cursor, it means the cursor was invalid
    if (!connection.edges.length && cursor) {
      throw new OpenAPIException(
        OpenAPIErrors.COMPANY.INVALID_CURSOR.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.COMPANY.INVALID_CURSOR.code,
      );
    }

    return {
      results: connection.edges.map((edge) => this.mapBizCompanyToCompany(edge.node, expand)),
      next: connection.pageInfo.hasNextPage
        ? `${apiUrl}/v1/companies?cursor=${connection.pageInfo.endCursor}`
        : null,
      previous:
        previousPage?.edges.length > 0
          ? `${apiUrl}/v1/companies?cursor=${previousPage.edges[previousPage.edges.length - 1].cursor}`
          : null,
    };
  }

  private mapBizCompanyToCompany(bizCompany: any, expand?: ExpandTypes): Company {
    const memberships =
      expand?.includes(ExpandType.MEMBERSHIPS) || expand?.includes(ExpandType.MEMBERSHIPS_USER)
        ? bizCompany.bizUsersOnCompany?.map((membership) => ({
            id: membership.id,
            object: 'membership',
            attributes: membership.data || {},
            created_at: membership.createdAt.toISOString(),
            groupId: membership.bizCompanyId,
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

  async upsertCompany(data: UpsertCompanyRequestDto, environmentId: string): Promise<Company> {
    const id = data.id;
    // Validate that only one of users or memberships is set
    if (data.users && data.memberships) {
      throw new OpenAPIException(
        OpenAPIErrors.COMPANY.INVALID_REQUEST.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.COMPANY.INVALID_REQUEST.code,
      );
    }
    const environment = await this.prisma.environment.findFirst({
      where: {
        id: environmentId,
      },
    });

    if (!environment) {
      throw new OpenAPIException(
        OpenAPIErrors.COMPANY.INVALID_REQUEST.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.COMPANY.INVALID_REQUEST.code,
      );
    }

    const projectId = environment.projectId;

    return await this.prisma.$transaction(async (tx) => {
      // First upsert the company with attributes
      const company = await this.bizService.upsertBizCompanyAttributes(
        tx,
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

      // Handle users and memberships
      if (data.users) {
        for (const user of data.users) {
          await this.bizService.upsertBizUsers(tx, user.id, user.attributes || {}, environmentId);
        }
      }

      if (data.memberships) {
        for (const membership of data.memberships) {
          await this.bizService.upsertBizUsers(
            tx,
            membership.user.id,
            membership.user.attributes || {},
            environmentId,
          );
        }
      }

      // Get the updated company data
      return await this.getCompany(company.id, environmentId);
    });
  }

  async deleteCompany(id: string, environmentId: string): Promise<void> {
    const bizCompany = await this.prisma.bizCompany.findFirst({
      where: {
        externalId: id,
        environmentId,
      },
    });

    if (!bizCompany) {
      throw new OpenAPIException(
        OpenAPIErrors.COMPANY.NOT_FOUND.message,
        HttpStatus.NOT_FOUND,
        OpenAPIErrors.COMPANY.NOT_FOUND.code,
      );
    }

    await this.bizService.deleteBizCompany([bizCompany.id], environmentId);
  }
}
