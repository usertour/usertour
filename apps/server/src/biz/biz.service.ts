import { AttributeBizType } from '@/attributes/models/attribute.model';
import { createConditionsFilter } from '@/common/attribute/filter';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
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
