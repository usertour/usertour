import { Injectable } from '@nestjs/common';
import { Prisma, type Segment as PrismaSegment } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import { PrismaService } from 'nestjs-prisma';

import { BizService } from '@/biz/biz.service';
import { AttributeBizType } from '@/attributes/models/attribute.model';
import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import {
  CompanyNotFoundError,
  SegmentNotFoundError,
  UserNotFoundError,
  ValidationError,
} from '@/common/errors/errors';

import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';

import { loadConditionContext } from '../content-representation/condition-context';
import { collectRuleIssues } from '../content-representation/condition-validate';
import { type CompileResolvers, compileConditions } from '../content-representation/rules.compile';
import { type DecompileResolvers } from '../content-representation/rules.decompile';
import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapSegment } from './segments.mapper';
import {
  CreateSegmentBody,
  ListSegmentsQuery,
  Segment,
  UpdateSegmentBody,
} from './segments.schema';

/**
 * v2 segments handler. Segment definitions are project-level (the row's
 * environmentId column is legacy/unused); membership is env-level. Condition
 * segments' `data` is the rule-condition model run through the shared rules codec.
 */
@Injectable()
export class ApiSegmentsService {
  constructor(
    private readonly biz: BizService,
    private readonly prisma: PrismaService,
  ) {}

  async list(
    requestUrl: string,
    projectId: string,
    query: ListSegmentsQuery,
  ): Promise<{ results: Segment[]; next: string | null; previous: string | null }> {
    const { bizType: bizTypeFilter, limit, cursor } = query;
    const resolvers = await this.buildDecompileResolvers(projectId);
    const bizType =
      bizTypeFilter === 'company'
        ? SegmentBizType.COMPANY
        : bizTypeFilter === 'user'
          ? SegmentBizType.USER
          : undefined;
    const orderByInput = Array.isArray(query.orderBy)
      ? query.orderBy
      : query.orderBy
        ? [query.orderBy]
        : ['createdAt'];
    const orderBy = parseOrderBy(orderByInput) as Prisma.SegmentOrderByWithRelationInput[];
    const where: Prisma.SegmentWhereInput = {
      projectId,
      ...(bizType !== undefined ? { bizType } : {}),
    };

    return paginate({
      requestUrl,
      cursor,
      limit,
      query: { ...(bizTypeFilter ? { bizType: bizTypeFilter } : {}) },
      fetch: (params) =>
        findManyCursorConnection<PrismaSegment, Prisma.SegmentWhereUniqueInput>(
          (args) => this.prisma.segment.findMany({ where, orderBy, ...args }),
          () => this.prisma.segment.count({ where }),
          params,
        ),
      map: (row) => mapSegment(row, resolvers),
    });
  }

  async get(id: string, projectId: string): Promise<Segment> {
    const seg = await this.requireSegment(id, projectId);
    const resolvers = await this.buildDecompileResolvers(projectId);
    return mapSegment(seg, resolvers);
  }

  /** Create a condition or manual segment (project-level; `all` is not creatable). */
  async create(projectId: string, body: CreateSegmentBody): Promise<Segment> {
    const bizType = body.bizType === 'company' ? SegmentBizType.COMPANY : SegmentBizType.USER;
    const dataType = body.kind === 'condition' ? SegmentDataType.CONDITION : SegmentDataType.MANUAL;
    let data: JsonValue | undefined;
    if (body.kind === 'condition') {
      const compileResolvers = await this.buildCompileResolvers(projectId);
      data = compileConditions(body.conditions, compileResolvers) as unknown as JsonValue;
      await this.assertConditionsValid(data, projectId);
    }
    const created = await this.biz.creatSegment({
      projectId,
      name: body.name,
      bizType,
      dataType,
      ...(data !== undefined ? { data } : {}),
    });
    const resolvers = await this.buildDecompileResolvers(projectId);
    return mapSegment(created, resolvers);
  }

  /** Update name and/or conditions (conditions only on condition segments). */
  async update(id: string, projectId: string, body: UpdateSegmentBody): Promise<Segment> {
    const seg = await this.requireSegment(id, projectId);
    if (seg.dataType === SegmentDataType.ALL) {
      throw new ValidationError('Cannot modify the built-in "all" segment.');
    }
    let data: JsonValue | undefined;
    if (body.conditions !== undefined) {
      if (seg.dataType !== SegmentDataType.CONDITION) {
        throw new ValidationError('Conditions can only be set on a condition segment.');
      }
      const compileResolvers = await this.buildCompileResolvers(projectId);
      data = compileConditions(body.conditions, compileResolvers) as unknown as JsonValue;
      await this.assertConditionsValid(data, projectId);
    }
    await this.biz.updateSegment({
      id,
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(data !== undefined ? { data } : {}),
    });
    const resolvers = await this.buildDecompileResolvers(projectId);
    return mapSegment(await this.requireSegment(id, projectId), resolvers);
  }

  /**
   * Reject a condition segment whose conditions are semantically broken — a
   * dangling attribute/segment/content/event reference, an operator the
   * attribute's data type doesn't support, or a missing required value. The
   * builder UI prevents these; the API has no such gate, and a broken segment
   * silently never-matches or match-alls at runtime. Segments have no publish
   * step, so this runs at write time (the only point of control). Same shared
   * validator the content publish/dry-run path uses.
   */
  private async assertConditionsValid(data: JsonValue, projectId: string): Promise<void> {
    const ctx = await loadConditionContext(this.prisma, projectId);
    const issues = collectRuleIssues(data, ctx, 'conditions');
    if (issues.length) {
      throw new ValidationError(
        `Invalid segment conditions: ${issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`,
      );
    }
  }

  /** Delete a segment (not the built-in `all`). Members cascade in the domain. */
  async delete(id: string, projectId: string): Promise<void> {
    const seg = await this.requireSegment(id, projectId);
    if (seg.dataType === SegmentDataType.ALL) {
      throw new ValidationError('Cannot delete the built-in "all" segment.');
    }
    await this.biz.deleteSegment({ id });
  }

  /** Add an env user/company to a manual segment (idempotent). */
  async addMember(
    id: string,
    projectId: string,
    environmentId: string,
    externalId: string,
  ): Promise<void> {
    const seg = await this.requireManualSegment(id, projectId);
    if (seg.bizType === SegmentBizType.COMPANY) {
      const company = await this.biz.getBizCompany(externalId, environmentId);
      if (!company) {
        throw new CompanyNotFoundError();
      }
      await this.biz.createBizCompanyOnSegment([
        { segmentId: id, bizCompanyId: company.id, data: {} },
      ]);
    } else {
      const user = await this.biz.getBizUser(externalId, environmentId);
      if (!user) {
        throw new UserNotFoundError();
      }
      await this.biz.createBizUserOnSegment([{ segmentId: id, bizUserId: user.id, data: {} }]);
    }
  }

  /** Remove an env user/company from a manual segment. */
  async removeMember(
    id: string,
    projectId: string,
    environmentId: string,
    externalId: string,
  ): Promise<void> {
    const seg = await this.requireManualSegment(id, projectId);
    if (seg.bizType === SegmentBizType.COMPANY) {
      const company = await this.biz.getBizCompany(externalId, environmentId);
      if (!company) {
        throw new CompanyNotFoundError();
      }
      await this.biz.deleteBizCompanyOnSegment({ segmentId: id, bizCompanyIds: [company.id] });
    } else {
      const user = await this.biz.getBizUser(externalId, environmentId);
      if (!user) {
        throw new UserNotFoundError();
      }
      await this.biz.deleteBizUserOnSegment({ segmentId: id, bizUserIds: [user.id] });
    }
  }

  /** Load a segment that belongs to this project, or 404. */
  private async requireSegment(id: string, projectId: string) {
    const seg = await this.prisma.segment.findUnique({ where: { id } });
    if (!seg || seg.projectId !== projectId) {
      throw new SegmentNotFoundError();
    }
    return seg;
  }

  private async requireManualSegment(id: string, projectId: string) {
    const seg = await this.requireSegment(id, projectId);
    if (seg.dataType !== SegmentDataType.MANUAL) {
      throw new ValidationError('Members can only be managed on a manual segment.');
    }
    return seg;
  }

  /** Internal attribute / event ids -> stable codeName (read; fallback: the id). */
  private async buildDecompileResolvers(projectId: string): Promise<DecompileResolvers> {
    const [attributes, events] = await Promise.all([
      this.prisma.attribute.findMany({
        where: { projectId },
        select: { id: true, codeName: true },
      }),
      this.prisma.event.findMany({ where: { projectId }, select: { id: true, codeName: true } }),
    ]);
    const attrMap = new Map(attributes.map((a) => [a.id, a.codeName]));
    const eventMap = new Map(events.map((e) => [e.id, e.codeName]));
    return {
      attributeCode: (id) => attrMap.get(id) ?? id,
      eventCode: (id) => eventMap.get(id) ?? id,
    };
  }

  /** Stable codeName -> internal attribute / event id (write; fallback: the code). */
  private async buildCompileResolvers(projectId: string): Promise<CompileResolvers> {
    const [attributes, events] = await Promise.all([
      this.prisma.attribute.findMany({
        where: { projectId },
        select: { id: true, codeName: true, bizType: true },
      }),
      this.prisma.event.findMany({ where: { projectId }, select: { id: true, codeName: true } }),
    ]);
    const attrMap = new Map(attributes.map((a) => [a.codeName, a.id]));
    const eventAttrMap = new Map(
      attributes.filter((a) => a.bizType === AttributeBizType.EVENT).map((a) => [a.codeName, a.id]),
    );
    const eventMap = new Map(events.map((e) => [e.codeName, e.id]));
    return {
      attributeId: (code) => attrMap.get(code) ?? code,
      eventId: (code) => eventMap.get(code) ?? code,
      eventAttributeId: (code) => eventAttrMap.get(code) ?? code,
    };
  }
}
