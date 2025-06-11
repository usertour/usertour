import { AttributeBizType } from '@/attributes/models/attribute.model';
import { createConditionsFilter } from '@/common/attribute/filter';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Prisma } from '@prisma/client';
import { BizOrder } from './dto/biz-order.input';
import { BizQuery } from './dto/biz-query.input';
import { CreateBizInput } from './dto/biz.input';
import {
  BizCompanyOnSegmentInput,
  BizUserOnSegmentInput,
  CreatSegment,
  DeleteBizCompanyOnSegment,
  DeleteBizUserOnSegment,
  DeleteSegment,
  UpdateSegment,
} from './dto/segment.input';
import { Segment, SegmentDataType } from './models/segment.model';
import { ParamsError, UnknownError } from '@/common/errors';
import {
  capitalizeFirstLetter,
  filterNullAttributes,
  getAttributeType,
  isNull,
} from '@/common/attribute/attribute';
import { BizAttributeTypes } from '@/common/consts/attribute';

@Injectable()
export class BizService {
  private readonly logger = new Logger(BizService.name);

  constructor(private prisma: PrismaService) {}

  async createBizUser(data: CreateBizInput) {
    return await this.prisma.bizUser.create({
      data,
    });
  }

  async createBizCompany(data: CreateBizInput) {
    return await this.prisma.bizCompany.create({
      data,
    });
  }

  async creatSegment(data: CreatSegment) {
    const environment = await this.prisma.environment.findFirst({
      where: { id: data.environmentId },
    });
    if (!environment) {
      throw new ParamsError('Environment not found');
    }

    return await this.prisma.segment.create({
      data: { ...data, projectId: environment.projectId },
    });
  }

  async getSegment(id: string) {
    return await this.prisma.segment.findUnique({
      where: { id },
    });
  }

  async updateSegment({ id, ...updates }: UpdateSegment) {
    return await this.prisma.segment.update({
      where: { id },
      data: { ...updates },
    });
  }

  async deleteSegment(data: DeleteSegment) {
    try {
      const deleteUsersOnSegment = this.prisma.bizUserOnSegment.deleteMany({
        where: { segmentId: data.id },
      });
      const deleteCompaniesOnSegment = this.prisma.bizCompanyOnSegment.deleteMany({
        where: { segmentId: data.id },
      });
      const deleteSegment = this.prisma.segment.delete({
        where: { id: data.id },
      });
      return await this.prisma.$transaction([
        deleteUsersOnSegment,
        deleteCompaniesOnSegment,
        deleteSegment,
      ]);
    } catch (_) {
      throw new UnknownError();
    }
  }

  async listSegment(environmentId: string) {
    const environment = await this.prisma.environment.findFirst({
      where: { id: environmentId },
    });
    if (!environment) {
      throw new ParamsError('Environment not found');
    }
    return await this.prisma.segment.findMany({
      where: { projectId: environment.projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createBizUserOnSegment(data: BizUserOnSegmentInput[]) {
    // Validate input data
    if (!data?.length) {
      throw new ParamsError('No data provided');
    }

    // Validate all items have the same segmentId
    const firstSegmentId = data[0].segmentId;
    if (!data.every((item) => item.segmentId === firstSegmentId)) {
      throw new ParamsError('All items must have the same segmentId');
    }

    // Get segment and validate
    const segment = await this.getSegment(firstSegmentId);
    if (!segment) {
      throw new ParamsError('Segment not found');
    }

    // Batch check all users exist in one query
    const userIds = data.map((item) => item.bizUserId);
    const existingUsers = await this.prisma.bizUser.findMany({
      where: {
        id: { in: userIds },
        environmentId: segment.environmentId,
      },
      select: { id: true },
    });

    const existingUserIds = new Set(existingUsers.map((user) => user.id));

    // Filter and map valid items
    const inserts = data
      .filter((item) => existingUserIds.has(item.bizUserId))
      .map((item) => ({
        bizUserId: item.bizUserId,
        segmentId: item.segmentId,
        data: item.data || {},
      }));

    if (inserts.length === 0) {
      throw new ParamsError('No valid users found');
    }

    return await this.prisma.bizUserOnSegment.createMany({
      data: inserts,
    });
  }

  async deleteBizUserOnSegment(data: DeleteBizUserOnSegment) {
    return await this.prisma.bizUserOnSegment.deleteMany({
      where: {
        segmentId: data.segmentId,
        bizUserId: { in: data.bizUserIds },
      },
    });
  }

  async createBizCompanyOnSegment(data: BizCompanyOnSegmentInput[]) {
    if (!data.every((item) => item.segmentId === data[0].segmentId)) {
      throw new ParamsError();
    }
    const segment = await this.getSegment(data[0].segmentId);
    if (!segment) {
      throw new ParamsError();
    }
    const inserts = data.filter(async (item) => {
      return await this.prisma.bizCompany.findFirst({
        where: {
          id: item.bizCompanyId,
          environmentId: segment.environmentId,
        },
      });
    });
    if (inserts.length === 0) {
      throw new ParamsError();
    }
    return await this.prisma.bizCompanyOnSegment.createMany({
      data: inserts,
    });
  }

  async deleteBizCompanyOnSegment(data: DeleteBizCompanyOnSegment) {
    return await this.prisma.bizCompanyOnSegment.deleteMany({
      where: {
        segmentId: data.segmentId,
        bizCompanyId: { in: data.bizCompanyIds },
      },
    });
  }

  private async executeDeleteUserTransaction(tx: Prisma.TransactionClient, deleteIds: string[]) {
    // Delete user-company relationships
    await tx.bizUserOnCompany.deleteMany({
      where: { bizUserId: { in: deleteIds } },
    });

    // Delete user-segment relationships
    await tx.bizUserOnSegment.deleteMany({
      where: { bizUserId: { in: deleteIds } },
    });

    // Delete user events
    await tx.bizEvent.deleteMany({
      where: { bizUserId: { in: deleteIds } },
    });

    // Delete user sessions
    await tx.bizSession.deleteMany({
      where: { bizUserId: { in: deleteIds } },
    });

    // Delete users
    return await tx.bizUser.deleteMany({
      where: { id: { in: deleteIds } },
    });
  }

  async deleteBizUser(ids: string[], environmentId: string) {
    // 1. Validate input
    if (!ids?.length) {
      throw new ParamsError('User IDs are required');
    }

    // 2. Find users to delete
    const bizUsers = await this.prisma.bizUser.findMany({
      where: {
        id: { in: ids },
        environmentId,
      },
      select: { id: true }, // Only select needed fields
    });

    if (!bizUsers.length) {
      throw new ParamsError('No users found to delete');
    }

    const deleteIds = bizUsers.map((bizUser) => bizUser.id);

    // 3. Execute all operations in a transaction
    return await this.prisma.$transaction(async (tx) => {
      return await this.executeDeleteUserTransaction(tx, deleteIds);
    });
  }

  async deleteBizCompany(ids: string[], environmentId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // First delete related records
      await tx.bizUserOnCompany.deleteMany({
        where: {
          bizCompanyId: { in: ids },
          bizCompany: {
            environmentId,
          },
        },
      });

      await tx.bizCompanyOnSegment.deleteMany({
        where: {
          bizCompanyId: { in: ids },
          bizCompany: {
            environmentId,
          },
        },
      });

      // Then delete the companies
      return await tx.bizCompany.deleteMany({
        where: {
          id: { in: ids },
          environmentId,
        },
      });
    });
  }

  async queryBizUser(query: BizQuery, pagination: PaginationArgs, orderBy: BizOrder) {
    const { first, last, before, after } = pagination;
    const { environmentId, segmentId, data, userId, search } = query;
    try {
      const environmenet = await this.prisma.environment.findUnique({
        where: { id: environmentId },
      });
      if (!environmenet) {
        return false;
      }
      const projectId = environmenet.projectId;
      let conditions: any = data ? data : {};
      let segment: Segment;
      if (segmentId) {
        segment = await this.prisma.segment.findFirst({
          where: { id: segmentId, projectId },
        });
        if (!segment) {
          return false;
        }
        if (!data && segment.dataType === SegmentDataType.CONDITION) {
          conditions = segment.data;
        }
      }
      const attributes = await this.prisma.attribute.findMany({
        where: {
          projectId,
          bizType: AttributeBizType.USER,
        },
      });
      const filter = createConditionsFilter(conditions, attributes);
      // const conditions = { ...c };
      const where: Record<string, any> = filter ? filter : {};
      if (segment && segment.dataType === SegmentDataType.MANUAL) {
        where.bizUsersOnSegment = {
          some: {
            segment: {
              id: segment.id,
            },
          },
        };
      }
      if (userId) {
        where.id = userId;
      }
      if (search) {
        where.externalId = { contains: search };
      }
      const resp = await findManyCursorConnection(
        (args) =>
          this.prisma.bizUser.findMany({
            where: {
              environmentId,
              ...where,
            },
            orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
            ...args,
          }),
        () =>
          this.prisma.bizUser.count({
            where: {
              environmentId,
              ...where,
            },
          }),
        { first, last, before, after },
      );
      return resp;
    } catch (error) {
      throw new UnknownError(error);
    }
  }

  async queryBizCompany(query: BizQuery, pagination: PaginationArgs, orderBy: BizOrder) {
    const { first, last, before, after } = pagination;
    const { environmentId, segmentId, data, companyId, search } = query;
    try {
      const environmenet = await this.prisma.environment.findUnique({
        where: { id: environmentId },
      });
      if (!environmenet) {
        return false;
      }
      const projectId = environmenet.projectId;
      let conditions: any = data ? data : {};
      let segment: Segment;
      if (segmentId) {
        segment = await this.prisma.segment.findFirst({
          where: { id: segmentId, projectId },
        });
        if (!segment) {
          return false;
        }
        if (!data && segment.dataType === SegmentDataType.CONDITION) {
          conditions = segment.data;
        }
      }
      const attributes = await this.prisma.attribute.findMany({
        where: {
          projectId: environmenet.projectId,
          bizType: AttributeBizType.COMPANY,
        },
      });
      const filter = createConditionsFilter(conditions, attributes);
      // const conditions = { ...c };
      const where: Record<string, any> = filter ? filter : {};
      if (segment && segment.dataType === SegmentDataType.MANUAL) {
        where.bizCompaniesOnSegment = {
          some: {
            segment: {
              id: segment.id,
            },
          },
        };
      }
      if (companyId) {
        where.id = companyId;
      }
      if (search) {
        where.externalId = { contains: search };
      }
      const resp = await findManyCursorConnection(
        (args) =>
          this.prisma.bizCompany.findMany({
            where: {
              environmentId,
              deleted: false,
              ...where,
            },
            orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
            ...args,
          }),
        () =>
          this.prisma.bizCompany.count({
            where: {
              environmentId,
              deleted: false,
              ...where,
            },
          }),
        { first, last, before, after },
      );
      return resp;
    } catch (error) {
      throw new UnknownError(error);
    }
  }

  async upsertBizUsers(
    tx: Prisma.TransactionClient,
    userId: string,
    attributes: any,
    environmentId: string,
  ): Promise<any> {
    const environmenet = await tx.environment.findFirst({
      where: { id: environmentId },
    });
    if (!environmenet) {
      return;
    }
    const projectId = environmenet.projectId;
    const insertAttribute = await this.insertBizAttributes(
      tx,
      projectId,
      AttributeBizType.USER,
      attributes,
    );

    const user = await tx.bizUser.findFirst({
      where: { externalId: String(userId), environmentId },
    });
    if (!user) {
      return await tx.bizUser.create({
        data: {
          externalId: String(userId),
          environmentId,
          data: insertAttribute,
        },
      });
    }
    const userData = JSON.parse(JSON.stringify(user.data));
    const insertData = filterNullAttributes({
      ...userData,
      ...insertAttribute,
    });

    return await tx.bizUser.update({
      where: {
        id: user.id,
      },
      data: {
        data: insertData,
      },
    });
  }

  async upsertBizCompanies(
    tx: Prisma.TransactionClient,
    externalCompanyId: string,
    externalUserId: string,
    attributes: any,
    environmentId: string,
    membership: any,
  ): Promise<any> {
    const environmenet = await tx.environment.findFirst({
      where: { id: environmentId },
    });
    if (!environmenet) {
      return;
    }
    const user = await tx.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId },
    });
    if (!user) {
      return;
    }

    const projectId = environmenet.projectId;
    const company = await this.upsertBizCompanyAttributes(
      tx,
      projectId,
      environmentId,
      externalCompanyId,
      attributes,
    );
    await this.upsertBizMembership(tx, projectId, company.id, user.id, membership || {});

    return company;
  }

  async upsertBizCompany(
    projectId: string,
    environmentId: string,
    companyId: string,
    attributes: any,
  ): Promise<any> {
    return await this.upsertBizCompanyAttributes(
      this.prisma,
      projectId,
      environmentId,
      companyId,
      attributes,
    );
  }

  async upsertBizCompanyAttributes(
    tx: Prisma.TransactionClient,
    projectId: string,
    environmentId: string,
    externalCompanyId: string,
    attributes: any,
  ): Promise<any> {
    const company = await tx.bizCompany.findFirst({
      where: { externalId: String(externalCompanyId), environmentId },
    });

    const insertAttribute = await this.insertBizAttributes(
      tx,
      projectId,
      AttributeBizType.COMPANY,
      attributes,
    );

    if (company) {
      const userData = JSON.parse(JSON.stringify(company.data));
      const insertData = filterNullAttributes({
        ...userData,
        ...insertAttribute,
      });
      return await tx.bizCompany.update({
        where: {
          id: company.id,
        },
        data: {
          data: insertData,
        },
      });
    }

    return await tx.bizCompany.create({
      data: {
        externalId: String(externalCompanyId),
        environmentId,
        data: insertAttribute,
      },
    });
  }

  async upsertBizMembership(
    tx: Prisma.TransactionClient,
    projectId: string,
    bizCompanyId: string,
    bizUserId: string,
    membership: any,
  ): Promise<any> {
    const insertAttribute = await this.insertBizAttributes(
      tx,
      projectId,
      AttributeBizType.MEMBERSHIP,
      membership,
    );

    const relation = await tx.bizUserOnCompany.findFirst({
      where: { bizCompanyId, bizUserId },
    });

    if (relation) {
      const userData = JSON.parse(JSON.stringify(relation.data));
      const insertData = filterNullAttributes({
        ...userData,
        ...insertAttribute,
      });
      return await tx.bizUserOnCompany.update({
        where: {
          id: relation.id,
        },
        data: {
          data: insertData,
        },
      });
    }
    return await tx.bizUserOnCompany.create({
      data: {
        bizUserId,
        bizCompanyId,
        data: insertAttribute,
      },
    });
  }

  async insertBizAttributes(
    tx: Prisma.TransactionClient,
    projectId: string,
    bizType: AttributeBizType,
    attributes: any,
  ): Promise<any> {
    const insertAttribute = {};
    for (const codeName in attributes) {
      const attrValue = attributes[codeName];
      const attrName = codeName;
      if (isNull(attrValue)) {
        insertAttribute[attrName] = null;
        continue;
      }
      const dataType = getAttributeType(attrValue);
      const attribute = await tx.attribute.findFirst({
        where: {
          projectId,
          codeName: attrName,
          bizType,
        },
      });
      if (!attribute) {
        const newAttr = await tx.attribute.create({
          data: {
            codeName: attrName,
            dataType: dataType,
            displayName: capitalizeFirstLetter(attrName),
            projectId,
            bizType,
          },
        });
        if (newAttr) {
          insertAttribute[attrName] = attrValue;
          continue;
        }
      }
      if (attribute && attribute.dataType === dataType) {
        if (dataType === BizAttributeTypes.DateTime) {
          insertAttribute[attrName] = new Date(attrValue).toISOString();
        } else {
          insertAttribute[attrName] = attrValue;
        }
      }
    }
    return insertAttribute;
  }

  async getBizUser(id: string, environmentId: string, include?: Prisma.BizUserInclude) {
    return await this.prisma.bizUser.findFirst({
      where: {
        externalId: id,
        environmentId,
      },
      include,
    });
  }

  async upsertUser(
    id: string,
    environmentId: string,
    attributes?: Record<string, any>,
    companies?: Array<{ id: string; attributes?: Record<string, any> }>,
    memberships?: Array<{
      company: { id: string; attributes?: Record<string, any> };
      attributes?: Record<string, any>;
    }>,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // First upsert the user with attributes
      const user = await this.upsertBizUsers(tx, id, attributes || {}, environmentId);

      if (!user) {
        throw new UnknownError('Failed to upsert user');
      }

      // Handle companies/companies and memberships
      if (companies) {
        for (const company of companies) {
          await this.upsertBizCompanies(
            tx,
            company.id,
            id,
            company.attributes || {},
            environmentId,
            {},
          );
        }
      }

      if (memberships) {
        for (const membership of memberships) {
          await this.upsertBizCompanies(
            tx,
            membership.company.id,
            id,
            membership.company.attributes || {},
            environmentId,
            membership.attributes || {},
          );
        }
      }

      return user;
    });
  }

  async getBizCompany(id: string, environmentId: string, include?: Prisma.BizCompanyInclude) {
    const bizCompany = await this.prisma.bizCompany.findFirst({
      where: {
        externalId: id,
        environmentId,
      },
      include,
    });

    if (!bizCompany) {
      throw new ParamsError('Company not found');
    }

    return bizCompany;
  }

  async listBizCompanies(
    environmentId: string,
    paginationArgs: {
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    },
    include?: Prisma.BizCompanyInclude,
    orderBy?: Prisma.BizCompanyOrderByWithRelationInput[],
  ) {
    const baseQuery = {
      where: {
        environmentId,
        deleted: false,
      },
      include,
      orderBy,
    };

    return await findManyCursorConnection(
      (args) => this.prisma.bizCompany.findMany({ ...baseQuery, ...args }),
      () => this.prisma.bizCompany.count({ where: baseQuery.where }),
      paginationArgs,
    );
  }

  async getBizCompanyMembership(userId: string, companyId: string, environmentId: string) {
    const membership = await this.prisma.bizUserOnCompany.findFirst({
      where: {
        bizUser: {
          externalId: userId,
          environmentId,
        },
        bizCompany: {
          externalId: companyId,
          environmentId,
        },
      },
    });

    return membership;
  }

  async deleteBizCompanyMembership(membershipId: string) {
    return await this.prisma.bizUserOnCompany.delete({
      where: {
        id: membershipId,
      },
    });
  }

  async listBizUsersWithRelations(
    environmentId: string,
    paginationArgs: {
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    },
    include?: Prisma.BizUserInclude,
    orderBy?: Prisma.BizUserOrderByWithRelationInput[],
    email?: string,
    companyId?: string,
    segmentId?: string,
  ) {
    const project = await this.prisma.environment.findFirst({
      where: { id: environmentId },
    });
    const projectId = project?.projectId;

    let where: Prisma.BizUserWhereInput = {
      environmentId,
      ...(email && {
        data: {
          path: ['email'],
          equals: email,
        },
      }),
      ...(companyId && {
        bizUsersOnCompany: {
          some: {
            bizCompany: {
              externalId: companyId,
            },
          },
        },
      }),
    };

    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId },
    });

    if (segment && segment.dataType !== SegmentDataType.ALL) {
      const attributes = await this.prisma.attribute.findMany({
        where: {
          projectId,
          bizType: {
            in: [AttributeBizType.USER],
          },
        },
      });
      if (segment.dataType === SegmentDataType.MANUAL) {
        where.bizUsersOnSegment = {
          some: {
            segmentId,
          },
        };
      }
      if (segment.dataType === SegmentDataType.CONDITION) {
        const filter = createConditionsFilter(segment.data, attributes);
        where = {
          ...where,
          ...filter,
        };
      }
    }

    const baseQuery: Prisma.BizUserFindManyArgs = {
      where,
      include,
      orderBy,
    };

    return await findManyCursorConnection(
      (args) => this.prisma.bizUser.findMany({ ...baseQuery, ...args }),
      () => this.prisma.bizUser.count({ where: baseQuery.where }),
      paginationArgs,
    );
  }
}
