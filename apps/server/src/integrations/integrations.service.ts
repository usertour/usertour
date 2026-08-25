import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import { INTEGRATION_PROVIDERS, INTEGRATION_TEST_TOPIC } from '@usertour/constants';
import type { IntegrationConfig } from '@usertour/types';
import { QUEUE_INTEGRATION_DELIVERY } from '@/common/consts/queen';
import {
  FeatureRequiresLicenseError,
  IntegrationNotFoundError,
  ValidationError,
} from '@/common/errors';
import { PaginationArgs } from '@/common/pagination/pagination.args';
import { ApiObjectType } from '@/api/shared/object-type';
import { OutboundLedgerService } from '@/outbound/outbound-ledger.service';
import { EncryptionService } from '@/shared/encryption.service';
import { ProjectsService } from '@/projects/projects.service';
import { UpsertIntegrationInput } from './dto/integration.input';
import { buildIntegrationMessage } from './integration-envelope';
import { IntegrationDeliveryJobData, IntegrationEventObject } from './integrations.types';

/** Job options for a one-shot, user-triggered send (test event). */
const SINGLE_ATTEMPT_JOB_OPTIONS = { removeOnComplete: true, removeOnFail: 1000, attempts: 1 };

/** The sample event a test delivery pushes — clearly labeled as Usertour's. */
const buildSampleEvent = (now: Date): IntegrationEventObject => ({
  id: 'evt_test',
  object: ApiObjectType.EVENT,
  codeName: 'usertour_test_event',
  eventDefinitionId: null,
  createdAt: now.toISOString(),
  userId: 'usertour-test-user',
  companyId: null,
  sessionId: null,
  contentId: null,
  versionId: null,
  attributes: { test: true },
});

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly ledger: OutboundLedgerService,
    private readonly encryption: EncryptionService,
    @InjectQueue(QUEUE_INTEGRATION_DELIVERY) private readonly deliveryQueue: Queue,
  ) {}

  /**
   * Exposure rule (stricter than webhook secrets): the API key NEVER leaves
   * the service — not on create, not on get. `keyTail` (captured at write
   * time) is the display stand-in, so no read path decrypts anything.
   */
  private withoutKey<T extends { key: string }>(row: T): Omit<T, 'key'> {
    const { key: _key, ...rest } = row;
    return rest;
  }

  // ---------------------------------------------------------------------------
  // Plan gate — mirrors webhooks (ADR 0011 §7): cloud Starter+, self-hosted
  // never gated. Writes and actions throw; the listener consults isEntitled
  // before enqueueing; reads and delete stay open on downgrade.
  // ---------------------------------------------------------------------------

  /** Whether the project owning this environment may use integrations right now. */
  async isEntitled(environmentId: string): Promise<boolean> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { projectId: true },
    });
    if (!environment) {
      return false;
    }
    const config = await this.projectsService.getProjectConfig(environment.projectId);
    return config.integrations;
  }

  private async assertEntitled(environmentId: string): Promise<void> {
    if (!(await this.isEntitled(environmentId))) {
      throw new FeatureRequiresLicenseError();
    }
  }

  async list(environmentId: string) {
    const rows = await this.prisma.integration.findMany({
      where: { environmentId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.withoutKey(row));
  }

  /**
   * Create-or-update the environment's configuration for one provider (an
   * environment has at most one row per provider — DB unique). The key is
   * required on first configure and optional afterwards: it is never echoed
   * back, so "keep the stored key" must be expressible as absence.
   */
  async upsert(data: UpsertIntegrationInput) {
    await this.assertEntitled(data.environmentId);
    if (!INTEGRATION_PROVIDERS.includes(data.provider as (typeof INTEGRATION_PROVIDERS)[number])) {
      throw new ValidationError(
        `Unknown provider "${data.provider}" — expected one of ${INTEGRATION_PROVIDERS.join(', ')}.`,
      );
    }
    const key = data.key?.trim();
    if (key === '') {
      // '' would encrypt fine and then fail every delivery — reject it as the
      // absence it actually means.
      throw new ValidationError('The API key cannot be empty.');
    }
    // Whitelist the config shape: the column is JSONB and this is the one
    // write chokepoint, so unknown keys stop here rather than in the adapters.
    const config: IntegrationConfig | undefined = data.config
      ? { ...(data.config.region ? { region: data.config.region } : {}) }
      : undefined;

    const existing = await this.prisma.integration.findUnique({
      where: {
        environmentId_provider: { environmentId: data.environmentId, provider: data.provider },
      },
    });
    if (!existing && !key) {
      throw new ValidationError('An API key is required to configure this integration.');
    }

    const keyWrite = key
      ? { key: this.encryption.encrypt(key) as string, keyTail: key.slice(-4) }
      : {};
    if (!existing) {
      const row = await this.prisma.integration.create({
        data: {
          environmentId: data.environmentId,
          provider: data.provider,
          ...(keyWrite as { key: string; keyTail: string }),
          config: config ?? {},
          enabled: data.enabled ?? true,
        },
      });
      return this.withoutKey(row);
    }

    // A new credential or destination (region) owes nothing to the old one's
    // failure streak; re-enabling is a fresh start — same reset rules as the
    // webhook update path.
    const reEnabling = data.enabled === true && !existing.enabled;
    const destinationChanged = key !== undefined || config !== undefined;
    const row = await this.prisma.integration.update({
      where: { id: existing.id },
      data: {
        ...keyWrite,
        ...(config !== undefined ? { config } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(reEnabling || destinationChanged
          ? { consecutiveFailures: 0, cooldownUntil: null, failingSince: null }
          : {}),
        ...(reEnabling ? { autoDisabledAt: null } : {}),
      },
    });
    return this.withoutKey(row);
  }

  /** Deliberately not entitlement-gated: downgrade cleanup stays open. */
  async delete(id: string) {
    const existing = await this.prisma.integration.findUnique({ where: { id } });
    if (!existing) {
      throw new IntegrationNotFoundError();
    }
    const row = await this.prisma.integration.delete({ where: { id } });
    return this.withoutKey(row);
  }

  /**
   * Enqueue a test message addressed directly to this integration: a sample
   * event through the normal delivery path (manual = bypasses cooldown — the
   * user IS the probe). Single attempt: the point is fast feedback in the
   * message log, not durable delivery.
   */
  async sendTestEvent(id: string) {
    const integration = await this.prisma.integration.findUnique({ where: { id } });
    if (!integration) {
      throw new IntegrationNotFoundError();
    }
    await this.assertEntitled(integration.environmentId);
    if (!integration.enabled) {
      throw new ValidationError('Enable the integration before sending a test event.');
    }

    const now = new Date();
    const { messageId, payload } = buildIntegrationMessage(
      INTEGRATION_TEST_TOPIC,
      integration.environmentId,
      buildSampleEvent(now),
      now,
    );
    const jobData: IntegrationDeliveryJobData = {
      integrationId: integration.id,
      messageId,
      manual: true,
      topic: INTEGRATION_TEST_TOPIC,
      payload,
    };
    const persisted = await this.ledger.createMessages([
      {
        id: messageId,
        environmentId: integration.environmentId,
        destination: { integrationId: integration.id },
        topic: INTEGRATION_TEST_TOPIC,
        payload: payload as any,
      },
    ]);
    if (!persisted.includes(messageId)) {
      // The ledger's per-row fallback swallowed the cause; recheck the FK to
      // label honestly — a concurrent delete is a 404, anything else must not
      // masquerade as one.
      const stillExists = await this.prisma.integration.findUnique({
        where: { id: integration.id },
        select: { id: true },
      });
      if (!stillExists) {
        throw new IntegrationNotFoundError();
      }
      throw new ValidationError('Failed to record the test message — try again.');
    }
    const jobId = `test-${messageId}`;
    try {
      await this.deliveryQueue.add('deliver', jobData, { ...SINGLE_ATTEMPT_JOB_OPTIONS, jobId });
    } catch (error) {
      // Ambiguous-outcome discipline (same as the webhook test event): verify
      // before compensating; a verified miss settles the row FAILED so the
      // reconcile sweep doesn't deliver a test nobody is waiting for.
      let phantom = null;
      try {
        phantom = await this.deliveryQueue.getJob(jobId);
      } catch {
        // Verification unreachable — fall through to the settle.
      }
      if (!phantom) {
        await this.ledger.recordAttempt(messageId, {
          attempt: 1,
          success: false,
          error: 'Failed to enqueue the delivery job',
          final: true,
        });
        throw error;
      }
    }
    return this.withoutKey(integration);
  }

  /** The integration's message log (newest first), each with its attempts. */
  async listMessages(integrationId: string, pagination: PaginationArgs) {
    const { first, last, before, after } = pagination ?? {};
    return this.ledger.listMessages({ integrationId }, { first, last, before, after });
  }
}
