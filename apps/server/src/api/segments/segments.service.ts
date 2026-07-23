import { Injectable } from '@nestjs/common';
import { Prisma, type Segment as PrismaSegment } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import { PrismaService } from 'nestjs-prisma';

import { BizService } from '@/biz/biz.service';
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
import { compileConditions } from '../content-representation/rules.compile';
import {
  loadDecompileResolvers,
  loadResolvers,
} from '../content-representation/attribute-resolvers';
import { nameContains } from '@/common/filters';
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
    const { bizType: bizTypeFilter, limit, cursor, name } = query;
    const resolvers = await loadDecompileResolvers(this.prisma, projectId);
    const nameFilter = nameContains(name);
    const bizType =
      bizTypeFilter === 'company'
        ? SegmentBizType.COMPANY
        : bizTypeFilter === 'user'
          ? SegmentBizType.USER
          : undefined;
    const orderBy = parseOrderBy(query.orderBy, [
      'createdAt',
    ]) as Prisma.SegmentOrderByWithRelationInput[];
    const where: Prisma.SegmentWhereInput = {
      projectId,
      ...(bizType !== undefined ? { bizType } : {}),
      ...(nameFilter ? { name: nameFilter } : {}),
    };

    return paginate({
      requestUrl,
      cursor,
      limit,
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
    const resolvers = await loadDecompileResolvers(this.prisma, projectId);
    return mapSegment(seg, resolvers);
  }

  /** Create a condition or manual segment (project-level; `all` is not creatable). */
  async create(projectId: string, body: CreateSegmentBody): Promise<Segment> {
    const bizType = body.bizType === 'company' ? SegmentBizType.COMPANY : SegmentBizType.USER;
    const dataType = body.kind === 'condition' ? SegmentDataType.CONDITION : SegmentDataType.MANUAL;
    const resolvers = await loadResolvers(this.prisma, projectId);
    let data: JsonValue | undefined;
    // A manual segment's membership is managed explicitly (add/remove member);
    // silently dropping a supplied `conditions` made callers believe they had
    // created a filtered segment when they got an empty one. Refuse, like the
    // update path always has.
    if (body.kind === 'manual' && body.conditions !== undefined) {
      throw new ValidationError(
        'A manual segment cannot carry `conditions` — its members are managed explicitly. ' +
          'Use kind "condition" for a filtered segment.',
      );
    }
    if (body.kind === 'condition') {
      this.assertSegmentConditionTypes(body.conditions);
      data = compileConditions(body.conditions, resolvers.compile) as unknown as JsonValue;
      await this.assertConditionsValid(data, projectId);
    }
    const created = await this.biz.creatSegment({
      projectId,
      name: body.name,
      bizType,
      dataType,
      ...(data !== undefined ? { data } : {}),
    });
    return mapSegment(created, resolvers.decompile);
  }

  /** Update name and/or conditions (conditions only on condition segments). */
  async update(id: string, projectId: string, body: UpdateSegmentBody): Promise<Segment> {
    const seg = await this.requireSegment(id, projectId);
    if (seg.dataType === SegmentDataType.ALL) {
      throw new ValidationError('Cannot modify the built-in "all" segment.');
    }
    const resolvers = await loadResolvers(this.prisma, projectId);
    let data: JsonValue | undefined;
    if (body.conditions !== undefined) {
      if (seg.dataType !== SegmentDataType.CONDITION) {
        throw new ValidationError('Conditions can only be set on a condition segment.');
      }
      this.assertSegmentConditionTypes(body.conditions);
      data = compileConditions(body.conditions, resolvers.compile) as unknown as JsonValue;
      await this.assertConditionsValid(data, projectId);
    }
    await this.biz.updateSegment({
      id,
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(data !== undefined ? { data } : {}),
    });
    return mapSegment(await this.requireSegment(id, projectId), resolvers.decompile);
  }

  /**
   * Reject condition types a segment can't actually evaluate. Segment membership
   * is a query over user/company ATTRIBUTES — the builder's segment editor only
   * offers `attribute` + `group`, and the evaluator (createConditionsFilter) only
   * implements those. Any other type the general condition union allows (event /
   * current_url / element / flow / segment / text / time) is silently skipped at
   * evaluation, which DROPS the constraint and makes the segment match too many
   * users — a segment of only such conditions matches everyone (fail-open). The
   * API/MCP accepts the full union (unlike the builder), so gate it here.
   */
  private assertSegmentConditionTypes(conditions: unknown): void {
    const ALLOWED = new Set(['attribute', 'group']);
    const walk = (conds: unknown, path: string): void => {
      if (!Array.isArray(conds)) return;
      conds.forEach((c, i) => {
        const at = `${path}[${i}]`;
        const type = (c as { type?: unknown })?.type;
        if (type === 'unsupported') {
          // The read side emits this placeholder for a stored condition the
          // schema cannot express. Echoing it back cannot preserve the stored
          // condition (conditions are a full replacement and the placeholder
          // carries no data), so refuse with directions instead of silently
          // dropping it.
          throw new ValidationError(
            `"unsupported" at ${at} is a read-side placeholder for a stored condition this API cannot express — it cannot be written back. Remove it from the write (which DELETES that stored condition) or migrate the segment's conditions in the builder first.`,
          );
        }
        if (typeof type !== 'string' || !ALLOWED.has(type)) {
          throw new ValidationError(
            `Segment conditions support only attribute conditions (and groups of them); got "${String(type)}" at ${at}. A segment's membership is computed from user/company attributes — event / page-url / element / flow / other content-targeting condition types are not evaluated for a segment (they would silently match every user). Use attribute conditions here, or put that logic on the content's start rules instead.`,
          );
        }
        if (type === 'group') walk((c as { conditions?: unknown }).conditions, `${at}.conditions`);
      });
    };
    walk(conditions, 'conditions');
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
}
