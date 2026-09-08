import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'nestjs-prisma';
import { CRM_INTEGRATION_PROVIDERS } from '@usertour/constants';
import {
  ENVIRONMENT_DELETING,
  type EnvironmentDeletingPayload,
} from '@/environments/environment.events';
import { CrmConnectionService } from './crm-connection.service';
import { CrmJournalService } from './crm-journal.service';
import { CrmMappingService } from './crm-mapping.service';

/**
 * What a CRM integration owns beyond its own rows (ADR 0013): provider-owned
 * attributes on the project, the grant at the provider, and the account's
 * change subscriptions. Rows cascade on delete; these do not, so every path
 * that removes a CRM integration runs this first.
 */
@Injectable()
export class CrmTeardownService {
  private readonly logger = new Logger(CrmTeardownService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mappings: CrmMappingService,
    private readonly journal: CrmJournalService,
    private readonly connections: CrmConnectionService,
  ) {}

  static isCrm(provider: string): boolean {
    return (CRM_INTEGRATION_PROVIDERS as readonly string[]).includes(provider);
  }

  /** Release attributes, drop subscriptions, revoke the grant; the row itself is the caller's. */
  async teardown(integrationId: string): Promise<void> {
    const row = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!row || !CrmTeardownService.isCrm(row.provider)) {
      return;
    }
    await this.mappings.releaseAllForIntegration(row.id);
    try {
      await this.journal.removeSubscriptions(row.id);
    } catch (error) {
      this.logger.warn(
        `Could not remove the change subscriptions of integration ${row.id}: ${(error as Error).message}`,
      );
    }
    await this.connections.revokeGrant(row);
  }

  @OnEvent(ENVIRONMENT_DELETING, { promisify: true })
  async onEnvironmentDeleting(payload: EnvironmentDeletingPayload): Promise<void> {
    const rows = await this.prisma.integration.findMany({
      where: {
        environmentId: payload.environmentId,
        provider: { in: [...CRM_INTEGRATION_PROVIDERS] },
      },
      select: { id: true },
    });
    for (const row of rows) {
      await this.teardown(row.id);
    }
  }
}
