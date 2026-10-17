import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { ProbeHealthIndicator } from './probe-health.indicator';

// Our own probe rather than terminus's Prisma indicator: that one tells a
// SQL client from a document client by matching the wording of a Prisma
// error, and a readiness check must not hinge on an error message staying
// the same across Prisma versions.
@Injectable()
export class DatabaseHealthIndicator extends ProbeHealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected async probe(): Promise<unknown> {
    return await this.prisma.$queryRaw`SELECT 1`;
  }
}
