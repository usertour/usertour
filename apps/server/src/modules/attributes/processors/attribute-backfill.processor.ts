import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { bucketValue, isBucketingDataType } from '@usertour/helpers';
import { AttributeBizType } from '../constants/attribute-biz-type.constant';
import {
  AttributeBackfillJobData,
  QUEUE_ATTRIBUTE_BACKFILL,
} from '../constants/attribute-queues.constant';

const BATCH_SIZE = 500;

/**
 * Writes a bucketing attribute's value onto every existing user (or company)
 * of the project that lacks it (ADR 0020 §3). The value is derived, so the
 * job only materialises what the formula already says: a row read before the
 * backfill reaches it gets the same answer from the read-time fallback.
 *
 * Each row is updated with a jsonb merge guarded by "key absent", so a
 * concurrent identify that already wrote other keys is never clobbered and a
 * re-run touches nothing.
 */
@Processor(QUEUE_ATTRIBUTE_BACKFILL)
export class AttributeBackfillProcessor extends WorkerHost {
  private readonly logger = new Logger(AttributeBackfillProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<AttributeBackfillJobData>): Promise<void> {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id: job.data.attributeId },
    });
    if (!attribute || attribute.deleted || !isBucketingDataType(attribute.dataType)) {
      return;
    }
    const isUser = attribute.bizType === AttributeBizType.USER;
    if (!isUser && attribute.bizType !== AttributeBizType.COMPANY) {
      return;
    }

    const environments = await this.prisma.environment.findMany({
      where: { projectId: attribute.projectId, deleted: false },
      select: { id: true },
    });
    let written = 0;
    for (const environment of environments) {
      let cursor: string | undefined;
      for (;;) {
        const rows = await this.readBatch(isUser, environment.id, cursor);
        if (rows.length === 0) {
          break;
        }
        for (const row of rows) {
          const stored = (row.data as Record<string, unknown> | null) ?? {};
          if (attribute.codeName in stored) {
            continue;
          }
          const value = bucketValue(attribute, row.externalId);
          if (value === undefined) {
            continue;
          }
          written += await this.writeMissing(isUser, row.id, attribute.codeName, value);
        }
        cursor = rows[rows.length - 1].id;
        if (rows.length < BATCH_SIZE) {
          break;
        }
      }
    }
    this.logger.log(
      `Backfilled bucketing attribute "${attribute.codeName}" (${attribute.id}) onto ${written} ${isUser ? 'user' : 'company'} row(s)`,
    );
  }

  private async readBatch(
    isUser: boolean,
    environmentId: string,
    cursor: string | undefined,
  ): Promise<Array<{ id: string; externalId: string; data: Prisma.JsonValue | null }>> {
    const args = {
      where: { environmentId, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: 'asc' as const },
      take: BATCH_SIZE,
      select: { id: true, externalId: true, data: true },
    };
    return isUser
      ? await this.prisma.bizUser.findMany(args)
      : await this.prisma.bizCompany.findMany(args);
  }

  /** Merge the key in only if it is still absent; returns rows touched (0 or 1). */
  private async writeMissing(
    isUser: boolean,
    rowId: string,
    codeName: string,
    value: string | number,
  ): Promise<number> {
    const patch = JSON.stringify({ [codeName]: value });
    return isUser
      ? await this.prisma
          .$executeRaw`UPDATE "BizUser" SET data = COALESCE(data, '{}'::jsonb) || ${patch}::jsonb WHERE id = ${rowId} AND NOT (COALESCE(data, '{}'::jsonb) ? ${codeName})`
      : await this.prisma
          .$executeRaw`UPDATE "BizCompany" SET data = COALESCE(data, '{}'::jsonb) || ${patch}::jsonb WHERE id = ${rowId} AND NOT (COALESCE(data, '{}'::jsonb) ? ${codeName})`;
  }
}
