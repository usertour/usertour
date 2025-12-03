import {
  Attribute,
  AttributeBizType,
  AttributeDataType,
} from '@/attributes/models/attribute.model';
import { createConditionsFilter } from '@/common/attribute/filter';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { BizCompany, BizUser, BizUserOnCompany, Prisma } from '@prisma/client';
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
import { Segment, SegmentBizType, SegmentDataType } from './models/segment.model';
import { ParamsError, UnknownError } from '@/common/errors';
import { BizAttributeTypes } from '@usertour/types';
import { IntegrationSource } from '@/common/types/integration';
import isEqual from 'fast-deep-equal';
import {
  capitalizeFirstLetter,
  filterNullAttributes,
  getAttributeType,
  isNull,
  isValidISO8601,
} from '@usertour/helpers';

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

  async findSegmentBySource(projectId: string, source: IntegrationSource, sourceId: string) {
    return await this.prisma.segment.findFirst({
      where: { projectId, source, sourceId },
    });
  }

  async createUserSegmentWithSource(
    projectId: string,
    name: string,
    source: string,
    sourceId: string,
  ) {
    return await this.prisma.segment.create({
      data: {
        projectId,
        name,
        bizType: SegmentBizType.USER,
        dataType: SegmentDataType.MANUAL,
        source,
        sourceId,
      },
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

    // Extract and validate first item
    const firstItem = data[0];

    // Validate all items have the same segmentId
    const segmentIds = new Set(data.map((item) => item.segmentId));
    if (segmentIds.size > 1) {
      throw new ParamsError('All items must have the same segmentId');
    }

    // Get segment and validate
    const segment = await this.getSegment(firstItem.segmentId);
    if (!segment) {
      throw new ParamsError('Segment not found');
    }

    // Batch check all users exist and have the same environmentId
    const existingUsers = await this.prisma.bizUser.findMany({
      where: {
        id: { in: data.map((item) => item.bizUserId) },
      },
      select: { id: true, environmentId: true },
    });

    const environmentIds = new Set(existingUsers.map((user) => user.environmentId));
    if (environmentIds.size > 1) {
      throw new ParamsError('All users must have the same environmentId');
    }

    // Map items for insertion
    const inserts = data.map((item) => ({
      bizUserId: item.bizUserId,
      segmentId: item.segmentId,
      data: item.data || {},
    }));

    return await this.prisma.bizUserOnSegment.createMany({
      data: inserts,
      skipDuplicates: true, // Skip duplicate records based on unique constraint
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
    // Validate input data
    if (!data?.length) {
      throw new ParamsError('No data provided');
    }

    // Extract and validate first item
    const firstItem = data[0];

    // Validate all items have the same segmentId
    const segmentIds = new Set(data.map((item) => item.segmentId));
    if (segmentIds.size > 1) {
      throw new ParamsError('All items must have the same segmentId');
    }

    // Get segment and validate
    const segment = await this.getSegment(firstItem.segmentId);
    if (!segment) {
      throw new ParamsError('Segment not found');
    }

    // Batch check all companies exist and have the same environmentId
    const existingCompanies = await this.prisma.bizCompany.findMany({
      where: {
        id: { in: data.map((item) => item.bizCompanyId) },
      },
      select: { id: true, environmentId: true },
    });

    const environmentIds = new Set(existingCompanies.map((company) => company.environmentId));
    if (environmentIds.size > 1) {
      throw new ParamsError('All companies must have the same environmentId');
    }

    // Map items for insertion
    const inserts = data.map((item) => ({
      bizCompanyId: item.bizCompanyId,
      segmentId: item.segmentId,
      data: item.data || {},
    }));

    return await this.prisma.bizCompanyOnSegment.createMany({
      data: inserts,
      skipDuplicates: true, // Skip duplicate records based on unique constraint
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

    // Delete user answers
    await tx.bizAnswer.deleteMany({
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

  private createSearchConditions(
    search: string,
    attributes: Attribute[],
    bizType: AttributeBizType,
  ) {
    const conditions: any[] = [
      // Search in externalId field
      { externalId: { contains: search } },
    ];

    // Add search conditions for all string attributes
    if (attributes && attributes.length > 0) {
      for (const attr of attributes) {
        if (attr.bizType === bizType && attr.dataType === AttributeDataType.String) {
          // String type - use contains search
          conditions.push({
            data: { path: [attr.codeName], string_contains: search },
          });
        } else if (attr.bizType === bizType && attr.dataType === AttributeDataType.Number) {
          // Number type - try to convert search to number and use equals
          const numValue = Number(search);
          if (!Number.isNaN(numValue)) {
            conditions.push({
              data: { path: [attr.codeName], equals: numValue },
            });
          }
        } else if (attr.bizType === bizType && attr.dataType === AttributeDataType.Boolean) {
          // Boolean type - convert search to boolean
          const boolValue = search.toLowerCase() === 'true' || search === '1';
          conditions.push({
            data: { path: [attr.codeName], equals: boolValue },
          });
        }
      }
    }

    return conditions;
  }

  async queryBizUser(query: BizQuery, pagination: PaginationArgs, orderBy: BizOrder) {
    const { first, last, before, after } = pagination;
    const { environmentId, segmentId, data, userId, search, companyId } = query;
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
        // Support searching across multiple fields
        where.OR = this.createSearchConditions(search, attributes, AttributeBizType.USER);
      }
      if (companyId) {
        where.bizUsersOnCompany = {
          some: {
            bizCompanyId: companyId,
          },
        };
      }
      const resp = await findManyCursorConnection(
        (args) =>
          this.prisma.bizUser.findMany({
            where: {
              environmentId,
              ...where,
            },
            include: {
              bizUsersOnCompany: {
                include: {
                  bizCompany: true,
                },
              },
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
        // Support searching across multiple fields for companies
        where.OR = this.createSearchConditions(search, attributes, AttributeBizType.COMPANY);
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
    externalUserId: string,
    attributes: Record<string, any>,
    environmentId: string,
  ): Promise<BizUser | null> {
    const environmenet = await tx.environment.findFirst({
      where: { id: environmentId },
    });
    if (!environmenet) {
      return null;
    }
    const projectId = environmenet.projectId;
    const insertAttribute = await this.insertBizAttributes(
      tx,
      projectId,
      AttributeBizType.USER,
      attributes,
    );

    const user = await tx.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId },
    });
    if (!user) {
      return await tx.bizUser.create({
        data: {
          externalId: String(externalUserId),
          environmentId,
          data: insertAttribute,
        },
      });
    }
    const currentData = (user.data as Record<string, any>) || {};
    const insertData = filterNullAttributes({
      ...currentData,
      ...insertAttribute,
    });

    // Only update if data has actually changed
    if (isEqual(currentData, insertData)) {
      return user;
    }

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
    attributes: Record<string, any>,
    environmentId: string,
    membership: Record<string, any>,
  ): Promise<BizCompany | null> {
    const environmenet = await tx.environment.findFirst({
      where: { id: environmentId },
    });
    if (!environmenet) {
      return null;
    }
    const user = await tx.bizUser.findFirst({
      where: { externalId: String(externalUserId), environmentId },
    });
    if (!user) {
      return null;
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
    attributes: Record<string, any>,
  ): Promise<BizCompany | null> {
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
    attributes: Record<string, any>,
  ): Promise<BizCompany | null> {
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
      const currentData = (company.data as Record<string, any>) || {};
      const mergedData = filterNullAttributes({
        ...currentData,
        ...insertAttribute,
      });

      // Only update if data has actually changed
      if (isEqual(currentData, mergedData)) {
        return company;
      }

      return await tx.bizCompany.update({
        where: {
          id: company.id,
        },
        data: {
          data: mergedData,
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
    membership: Record<string, any>,
  ): Promise<BizUserOnCompany> {
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
      const currentData = (relation.data as Record<string, any>) || {};
      const mergedData = filterNullAttributes({
        ...currentData,
        ...insertAttribute,
      });

      // Only update if data has actually changed
      if (isEqual(currentData, mergedData)) {
        return relation;
      }

      return await tx.bizUserOnCompany.update({
        where: {
          id: relation.id,
        },
        data: {
          data: mergedData,
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
    attributes: Record<string, any>,
  ): Promise<Record<string, any>> {
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
          // DateTime must be stored as ISO 8601 in UTC
          if (dataType === BizAttributeTypes.DateTime) {
            if (!isValidISO8601(attrValue)) {
              this.logger.error(
                `Invalid DateTime format for attribute "${attrName}". DateTime attributes must be in ISO 8601 format (UTC). Received: ${JSON.stringify(attrValue)}. Example: "2024-12-12T00:00:00.000Z". Skipping this field.`,
              );
              continue;
            }
            insertAttribute[attrName] = attrValue;
          } else {
            insertAttribute[attrName] = attrValue;
          }
          continue;
        }
      }
      if (attribute) {
        // If attribute is DateTime type, value must be ISO 8601 format regardless of detected type
        if (attribute.dataType === BizAttributeTypes.DateTime) {
          if (!isValidISO8601(attrValue)) {
            this.logger.error(
              `Invalid DateTime format for attribute "${attrName}". DateTime attributes must be in ISO 8601 format (UTC). Received: ${JSON.stringify(attrValue)}. Example: "2024-12-12T00:00:00.000Z". Skipping this field.`,
            );
            continue;
          }
          insertAttribute[attrName] = attrValue;
        } else if (attribute.dataType === dataType) {
          // For non-DateTime types, only store if types match
          insertAttribute[attrName] = attrValue;
        } else {
          // Log type mismatch but don't throw error to allow flexibility
          this.logger.warn(
            `Type mismatch for attribute ${attrName}. Expected type: ${attribute.dataType}, got: ${dataType}. Value: ${attrValue}`,
          );
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
    externalUserId: string,
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
      const user = await this.upsertBizUsers(tx, externalUserId, attributes || {}, environmentId);

      if (!user) {
        throw new UnknownError('Failed to upsert user');
      }

      // Handle companies/companies and memberships
      if (companies) {
        for (const company of companies) {
          await this.upsertBizCompanies(
            tx,
            company.id,
            externalUserId,
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
            externalUserId,
            membership.company.attributes || {},
            environmentId,
            membership.attributes || {},
          );
        }
      }

      return user;
    });
  }

  async getBizCompany(
    id: string,
    environmentId: string,
    include?: Prisma.BizCompanyInclude,
  ): Promise<BizCompany | null> {
    const bizCompany = await this.prisma.bizCompany.findFirst({
      where: {
        externalId: id,
        environmentId,
      },
      include,
    });

    if (!bizCompany) {
      return null;
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
