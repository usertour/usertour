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
    return await this.prisma.segment.create({
      data,
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
    return await this.prisma.segment.findMany({
      where: { environmentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createBizUserOnSegment(data: BizUserOnSegmentInput[]) {
    if (!data.every((item) => item.segmentId === data[0].segmentId)) {
      throw new ParamsError();
    }
    const segment = await this.getSegment(data[0].segmentId);
    if (!segment) {
      throw new ParamsError();
    }
    const inserts = data.filter(async (item) => {
      return await this.prisma.bizUser.findFirst({
        where: {
          id: item.bizUserId,
          environmentId: segment.environmentId,
        },
      });
    });
    if (inserts.length === 0) {
      throw new ParamsError();
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
        },
      });

      await tx.bizCompanyOnSegment.deleteMany({
        where: {
          bizCompanyId: { in: ids },
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
      let conditions: any = data ? data : {};
      let segment: Segment;
      if (segmentId) {
        segment = await this.prisma.segment.findFirst({
          where: { id: segmentId, environmentId },
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
      let conditions: any = data ? data : {};
      let segment: Segment;
      if (segmentId) {
        segment = await this.prisma.segment.findFirst({
          where: { id: segmentId, environmentId },
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
    companyId: string,
    userId: string,
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
      where: { externalId: String(userId), environmentId },
    });
    if (!user) {
      return;
    }

    const projectId = environmenet.projectId;
    const company = await this.upsertBizCompanyAttributes(
      tx,
      projectId,
      environmentId,
      companyId,
      attributes,
    );
    await this.upsertBizMembership(tx, projectId, company.id, user.id, membership || {});

    return company;
  }

  async upsertBizCompanyAttributes(
    tx: Prisma.TransactionClient,
    projectId: string,
    environmentId: string,
    companyId: string,
    attributes: any,
  ): Promise<any> {
    const company = await tx.bizCompany.findFirst({
      where: { externalId: String(companyId), environmentId },
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
        externalId: String(companyId),
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
}
