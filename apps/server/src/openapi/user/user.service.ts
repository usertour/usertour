import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { User } from '../models/user.model';
import { ConfigService } from '@nestjs/config';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { OpenAPIException } from '../exceptions/openapi.exception';
import { HttpStatus } from '@nestjs/common';
import { OpenAPIErrors } from '../constants/errors';
import { UpsertUserRequestDto } from './user.dto';
import { BizService } from '../../biz/biz.service';
import { ExpandType, ExpandTypes } from './user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private bizService: BizService,
  ) {}

  async getUser(id: string, environmentId: string, expand?: ExpandTypes): Promise<User> {
    const bizUser = await this.prisma.bizUser.findFirst({
      where: {
        externalId: id,
        environmentId,
      },
      include: {
        bizUsersOnCompany:
          expand?.length > 0
            ? {
                include: {
                  bizCompany: expand.includes(ExpandType.GROUPS),
                  bizUser: expand.includes(ExpandType.MEMBERSHIPS),
                },
              }
            : false,
      },
    });

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
    const baseQuery = {
      where: { environmentId },
      include: {
        bizUsersOnCompany:
          expand?.length > 0
            ? {
                include: {
                  bizCompany: expand.includes(ExpandType.GROUPS),
                  bizUser: expand.includes(ExpandType.MEMBERSHIPS),
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
          (args) => this.prisma.bizUser.findMany({ ...baseQuery, ...args }),
          () => this.prisma.bizUser.count({ where: { environmentId } }),
          { last: pageSize, before: cursor },
        );
      } catch (error) {
        this.logger.warn(`Failed to get previous page: ${error.message}`);
        throw new OpenAPIException(
          OpenAPIErrors.USER.INVALID_CURSOR_PREVIOUS.message,
          HttpStatus.BAD_REQUEST,
          OpenAPIErrors.USER.INVALID_CURSOR_PREVIOUS.code,
        );
      }
    }

    let connection: any;
    try {
      connection = await findManyCursorConnection(
        (args) => this.prisma.bizUser.findMany({ ...baseQuery, ...args }),
        () => this.prisma.bizUser.count({ where: { environmentId } }),
        { first: pageSize, after: cursor },
      );
    } catch (error) {
      this.logger.error(`Failed to get current page: ${error.message}`);
      throw new OpenAPIException(
        OpenAPIErrors.USER.INVALID_CURSOR.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.USER.INVALID_CURSOR.code,
      );
    }

    // If we got no results and there was a cursor, it means the cursor was invalid
    if (!connection.edges.length && cursor) {
      throw new OpenAPIException(
        OpenAPIErrors.USER.INVALID_CURSOR.message,
        HttpStatus.BAD_REQUEST,
        OpenAPIErrors.USER.INVALID_CURSOR.code,
      );
    }

    return {
      results: connection.edges.map((edge) => this.mapBizUserToUser(edge.node, expand)),
      next: connection.pageInfo.hasNextPage
        ? `${apiUrl}/v1/users?cursor=${connection.pageInfo.endCursor}`
        : null,
      previous:
        previousPage?.edges.length > 0
          ? `${apiUrl}/v1/users?cursor=${previousPage.edges[previousPage.edges.length - 1].cursor}`
          : null,
    };
  }

  private mapBizUserToUser(bizUser: any, expand?: ExpandTypes): User {
    return {
      id: bizUser.externalId,
      object: 'user',
      attributes: bizUser.data || {},
      createdAt: bizUser.createdAt.toISOString(),
      companies: expand?.includes(ExpandType.GROUPS)
        ? bizUser.bizUsersOnCompany?.map((membership) => ({
            id: membership.bizCompany.externalId,
            object: 'company',
            attributes: membership.bizCompany.data || {},
            createdAt: membership.bizCompany.createdAt.toISOString(),
          }))
        : null,
      memberships: expand?.includes(ExpandType.MEMBERSHIPS)
        ? bizUser.bizUsersOnCompany?.map((membership) => ({
            id: membership.id,
            object: 'membership',
            attributes: membership.data || {},
            created_at: membership.createdAt.toISOString(),
            groupId: membership.bizCompanyId,
            userId: membership.bizUserId,
          }))
        : null,
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

    return await this.prisma.$transaction(async (tx) => {
      // First upsert the user with attributes
      const user = await this.bizService.upsertBizUsers(
        tx,
        id,
        data.attributes || {},
        environmentId,
      );

      if (!user) {
        throw new OpenAPIException(
          OpenAPIErrors.COMMON.INTERNAL_SERVER_ERROR.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
          OpenAPIErrors.COMMON.INTERNAL_SERVER_ERROR.code,
        );
      }

      // Handle groups/companies and memberships
      if (data.companies) {
        for (const company of data.companies) {
          await this.bizService.upsertBizCompanies(
            tx,
            company.id,
            id,
            company.attributes || {},
            environmentId,
            {},
          );
        }
      }

      if (data.memberships) {
        for (const membership of data.memberships) {
          await this.bizService.upsertBizCompanies(
            tx,
            membership.company.id,
            id,
            membership.company.attributes || {},
            environmentId,
            membership.attributes || {},
          );
        }
      }

      // Get the updated user data
      return await this.getUser(user.id, environmentId);
    });
  }

  async deleteUser(id: string, environmentId: string): Promise<void> {
    const bizUser = await this.prisma.bizUser.findFirst({
      where: {
        externalId: id,
        environmentId,
      },
    });

    if (!bizUser) {
      throw new OpenAPIException(
        OpenAPIErrors.USER.NOT_FOUND.message,
        HttpStatus.NOT_FOUND,
        OpenAPIErrors.USER.NOT_FOUND.code,
      );
    }

    await this.bizService.deleteBizUser([bizUser.id], environmentId);
  }
}
