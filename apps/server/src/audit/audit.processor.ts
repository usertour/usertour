import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { QUEUE_AUDIT_LOG } from '@/common/consts/queen';
import type { AuditEntry } from './audit.types';

/**
 * Persists audit entries to the append-only `AuditLog` table. Append-only: rows
 * are never updated or deleted here.
 */
@Processor(QUEUE_AUDIT_LOG)
export class AuditProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<AuditEntry>): Promise<void> {
    const e = job.data;
    try {
      await this.prisma.auditLog.create({
        data: {
          projectId: e.projectId,
          environmentId: e.environmentId ?? null,
          source: e.source,
          actorUserId: e.actorUserId ?? null,
          actorTokenId: e.actorTokenId ?? null,
          action: e.action,
          operation: e.operation,
          resourceType: e.resourceType,
          resourceId: e.resourceId,
          ...(e.before !== undefined ? { before: e.before as Prisma.InputJsonValue } : {}),
          ...(e.after !== undefined ? { after: e.after as Prisma.InputJsonValue } : {}),
          ...(e.metadata != null ? { metadata: e.metadata as Prisma.InputJsonValue } : {}),
        },
      });
    } catch (error) {
      // Let Bull retry per the job's backoff policy.
      this.logger.error(
        `Failed to write audit log for ${e.operation} ${e.resourceType}/${e.resourceId}`,
        error as Error,
      );
      throw error;
    }
  }
}
