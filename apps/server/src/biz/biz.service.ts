import { AttributeBizType } from '@/attributes/models/attribute.model';
import { getAttributeType } from '@/common/attribute/attribute';
import { createConditionsFilter } from '@/common/attribute/filter';
import { BizAttributeTypes } from '@/common/consts/attribute';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { BizOrder } from './dto/biz-order.input';
import { BizQuery } from './dto/biz-query.input';
import { CreateBizCompanyInput, CreateBizInput } from './dto/biz.input';
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

@Injectable()
export class BizService {
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

  async upsertBizUsers(data: CreateBizInput): Promise<boolean> {
    const { externalId: userId, data: attributes, environmentId } = data;
    const environmenet = await this.prisma.environment.findUnique({
      where: { id: environmentId },
    });
    if (!environmenet) {
      return false;
    }
    const projectId = environmenet.projectId;
    const insertAttribute = await this.insertAttributes(projectId, attributes, 1);
    const user = await this.prisma.bizUser.findFirst({
      where: { externalId: userId, environmentId },
    });
    if (!user) {
      const ret = await this.prisma.bizUser.create({
        data: {
          externalId: userId,
          environmentId,
          data: insertAttribute,
        },
      });
      return Boolean(ret);
    }

    const userData = JSON.parse(JSON.stringify(user.data));
    const insertData = { ...userData, ...insertAttribute };

    const ret = await this.prisma.bizUser.update({
      where: {
        id: user.id,
      },
      data: {
        data: insertData,
      },
    });
    return Boolean(ret);
  }

  async upsertBizCompany(data: CreateBizCompanyInput): Promise<boolean> {
    const { externalId, data: attributes, environmentId, membership, userId } = data;
    const environmenet = await this.prisma.environment.findUnique({
      where: { id: environmentId },
    });
    const user = await this.prisma.bizUser.findFirst({
      where: { externalId: userId, environmentId },
    });
    if (!environmenet || !user) {
      return false;
    }
    const projectId = environmenet.projectId;
    const insertAttribute = await this.insertAttributes(projectId, attributes, 2);
    let bizCompanyId: string;
    const company = await this.prisma.bizCompany.findFirst({
      where: { externalId, environmentId },
    });
    if (!company) {
      const ret = await this.prisma.bizCompany.create({
        data: {
          externalId,
          environmentId,
          data: insertAttribute,
        },
      });
      if (ret) {
        bizCompanyId = ret.id;
      }
    } else {
      const userData = JSON.parse(JSON.stringify(company.data));
      const ret = await this.prisma.bizCompany.update({
        where: {
          id: company.id,
        },
        data: {
          data: { ...userData, ...insertAttribute },
        },
      });
      if (ret) {
        bizCompanyId = ret.id;
      }
    }
    if (bizCompanyId) {
      await this.prisma.bizUser.update({
        where: { id: user.id },
        data: { bizCompanyId },
      });
    }
    if (membership) {
      const insertAttribute = await this.insertAttributes(projectId, membership, 3);
      const m1 = await this.prisma.bizUserOnCompany.findFirst({
        where: {
          bizCompanyId: bizCompanyId,
          bizUserId: user.id,
        },
      });
      if (!m1) {
        await this.prisma.bizUserOnCompany.create({
          data: {
            bizCompanyId: bizCompanyId,
            bizUserId: user.id,
            data: insertAttribute,
          },
        });
      } else {
        await this.prisma.bizUserOnCompany.update({
          where: { id: m1.id },
          data: {
            data: insertAttribute,
          },
        });
      }
    }
    return true;
  }

  async insertAttributes(projectId, attributes: any, bizType: number) {
    const insertAttribute = {};
    for (const codeName in attributes) {
      const attrValue = attributes[codeName];
      const attrName = codeName;
      const dataType = getAttributeType(attrValue);
      const attribute = await this.prisma.attribute.findFirst({
        where: {
          projectId,
          bizType: bizType,
          codeName: attrName,
        },
      });
      if (!attribute) {
        const newAttr = await this.prisma.attribute.create({
          data: {
            codeName: attrName,
            dataType: dataType,
            displayName: attrName,
            bizType: bizType,
            projectId,
          },
        });
        if (newAttr) {
          insertAttribute[attrName] = attrValue;
          continue;
        }
      }
      if (attribute && attribute.dataType === dataType) {
        insertAttribute[attrName] = attrValue;
      }
      if (dataType === BizAttributeTypes.DateTime) {
        insertAttribute[attrName] = new Date(attrValue).toISOString();
      }
    }
    return insertAttribute;
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

  async deleteBizUser(ids: string[], environmentId: string) {
    try {
      const bizUsers = await this.prisma.bizUser.findMany({
        where: {
          id: { in: ids },
          environmentId,
        },
      });
      const deleteIds = bizUsers.map((bizUser) => bizUser.id);
      if (deleteIds.length === 0) {
        throw new ParamsError();
      }
      const deleteUsersOnCompany = this.prisma.bizUserOnCompany.deleteMany({
        where: { bizUserId: { in: deleteIds } },
      });
      const deleteUsersOnSegment = this.prisma.bizUserOnSegment.deleteMany({
        where: { bizUserId: { in: deleteIds } },
      });
      const deleteUsers = this.prisma.bizUser.deleteMany({
        where: {
          id: { in: deleteIds },
        },
      });
      return await this.prisma.$transaction([
        deleteUsersOnCompany,
        deleteUsersOnSegment,
        deleteUsers,
      ]);
    } catch (_) {
      throw new UnknownError();
    }
  }

  async deleteBizCompany(ids: string[], environmentId: string) {
    return await this.prisma.bizCompany.updateMany({
      where: {
        id: { in: ids },
        environmentId,
      },
      data: {
        deleted: true,
      },
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
      console.log(JSON.stringify(filter));
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
      console.log('where:', JSON.stringify(where));
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
      console.log(resp);
      return resp;
    } catch (error) {
      console.log(error);
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
      console.log('where:', JSON.stringify(where));
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
      console.log(resp);
      return resp;
    } catch (error) {
      console.log(error);
    }
  }
}
