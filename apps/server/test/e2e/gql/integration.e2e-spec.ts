import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { EncryptionService } from '@/shared/encryption.service';

import { graphql, gqlData } from '../auth';
import { buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';
import { createTestApp } from '../create-test-app';

const UPSERT_INTEGRATION = `mutation ($data: UpsertIntegrationInput!) {
  upsertIntegration(data: $data) { id environmentId provider keyTail config enabled autoDisabledAt }
}`;
const DELETE_INTEGRATION =
  'mutation ($data: IntegrationIdInput!) { deleteIntegration(data: $data) { id } }';
const SEND_TEST_EVENT =
  'mutation ($data: IntegrationIdInput!) { sendIntegrationTestEvent(data: $data) { id } }';
const LIST_INTEGRATIONS = `query ($environmentId: String!) {
  listIntegrations(environmentId: $environmentId) { id provider keyTail enabled }
}`;
const QUERY_MESSAGES = `query ($integrationId: String!, $first: Int) {
  queryIntegrationMessages(integrationId: $integrationId, first: $first) {
    totalCount
    edges { node { id topic status payload deliveries { attempt success responseStatus } } }
    pageInfo { hasNextPage endCursor }
  }
}`;

/**
 * Functional e2e for the `integrations` GraphQL resolver (ADR 0011): config
 * CRUD as an authorized OWNER with effects asserted in the DB. Delivery is
 * unit-tested at the adapter/processor level; the plan gate has its own spec
 * (integrations-plan-gate.e2e-spec).
 */
describe('GraphQL integrations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let token: string;
  const userIds: string[] = [];

  // A second project to prove cross-project isolation.
  let otherProjectId: string;
  let otherOwnerToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-integrations' });
    projectId = project.id;
    // Integrations are Starter+ on cloud; entitle the project so the CRUD
    // surface under test is reachable whichever mode the run resolves to.
    await buildSubscription(prisma, { projectId, planType: 'starter' });
    const environment = await buildEnvironment(prisma, { projectId });
    environmentId = environment.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    token = owner.token;
    userIds.push(owner.user.id);

    const otherProject = await buildProject(prisma, { name: 'gql-integrations-other' });
    otherProjectId = otherProject.id;
    const otherOwner = await buildAuthorizedUser(prisma, app, {
      projectId: otherProjectId,
      role: 'OWNER',
    });
    otherOwnerToken = otherOwner.token;
    userIds.push(otherOwner.user.id);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await teardownProject(prisma, projectId);
      await teardownProject(prisma, otherProjectId);
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
  });

  afterEach(async () => {
    // One row per (environment, provider) — clear between tests so each can
    // exercise the create path.
    await prisma.integration.deleteMany({ where: { environmentId } });
  });

  const upsertIntegration = async (overrides: Record<string, unknown> = {}) => {
    const res = await graphql(app, {
      token,
      query: UPSERT_INTEGRATION,
      variables: {
        data: { environmentId, provider: 'amplitude', key: 'amp-key-8f3e21', ...overrides },
      },
    });
    return gqlData(res).upsertIntegration;
  };

  describe('upsertIntegration (create)', () => {
    it('creates an enabled row with the key encrypted at rest and only the tail exposed', async () => {
      const created = await upsertIntegration({ config: { region: 'EU' } });
      expect(created.environmentId).toBe(environmentId);
      expect(created.provider).toBe('amplitude');
      expect(created.enabled).toBe(true);
      expect(created.keyTail).toBe('3e21');
      expect(created.config).toEqual({ region: 'EU' });

      const row = await prisma.integration.findUnique({ where: { id: created.id } });
      // At rest the key is AES-256-GCM ciphertext, never plaintext.
      expect(row?.key).not.toBe('amp-key-8f3e21');
      const encryption = app.get(EncryptionService);
      expect(encryption.decrypt(row?.key ?? '')).toBe('amp-key-8f3e21');
    });

    it('the API key is not a queryable field at all', async () => {
      const res = await graphql(app, {
        token,
        query:
          'query ($environmentId: String!) { listIntegrations(environmentId: $environmentId) { id key } }',
        variables: { environmentId },
      });
      // GraphQL validation error: the Integration type has no `key` field.
      expect(res.body.errors).toBeDefined();
    });

    it('rejects an unknown provider, a missing first key, and an empty key', async () => {
      for (const data of [
        { environmentId, provider: 'salesforce', key: 'k' },
        { environmentId, provider: 'amplitude' },
        { environmentId, provider: 'amplitude', key: '  ' },
      ]) {
        const res = await graphql(app, { token, query: UPSERT_INTEGRATION, variables: { data } });
        expect(res.body.errors).toBeDefined();
      }
      expect(await prisma.integration.count({ where: { environmentId } })).toBe(0);
    });

    it('whitelists the config shape (unknown region rejected)', async () => {
      const res = await graphql(app, {
        token,
        query: UPSERT_INTEGRATION,
        variables: {
          data: {
            environmentId,
            provider: 'posthog',
            key: 'ph-key',
            config: { region: 'APAC' },
          },
        },
      });
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('upsertIntegration (update)', () => {
    it('updates in place (no second row) and keeps the stored key when omitted', async () => {
      const created = await upsertIntegration();
      const updated = await upsertIntegration({ key: undefined, enabled: false });
      expect(updated.id).toBe(created.id);
      expect(updated.enabled).toBe(false);
      expect(updated.keyTail).toBe('3e21');
      expect(await prisma.integration.count({ where: { environmentId } })).toBe(1);
    });

    it('a new key resets the circuit-breaker state; a plain enabled flip keeps it', async () => {
      const created = await upsertIntegration();
      const breakerState = {
        consecutiveFailures: 7,
        cooldownUntil: new Date(Date.now() + 30 * 60_000),
        failingSince: new Date(Date.now() - 60 * 60_000),
      };
      await prisma.integration.update({ where: { id: created.id }, data: breakerState });

      // Disabling (no key, no config) keeps the streak.
      await upsertIntegration({ key: undefined, enabled: false });
      let row = await prisma.integration.findUnique({ where: { id: created.id } });
      expect(row?.consecutiveFailures).toBe(7);
      expect(row?.cooldownUntil).not.toBeNull();

      // A NEW credential owes nothing to the old one's failures.
      await upsertIntegration({ key: 'amp-key-fresh' });
      row = await prisma.integration.findUnique({ where: { id: created.id } });
      expect(row?.consecutiveFailures).toBe(0);
      expect(row?.cooldownUntil).toBeNull();
      expect(row?.failingSince).toBeNull();
      expect(row?.keyTail).toBe('resh');
    });

    it('re-enabling clears the auto-disable marker', async () => {
      const created = await upsertIntegration();
      await prisma.integration.update({
        where: { id: created.id },
        data: { enabled: false, autoDisabledAt: new Date() },
      });

      const updated = await upsertIntegration({ key: undefined, enabled: true });
      expect(updated.enabled).toBe(true);
      expect(updated.autoDisabledAt).toBeNull();
    });
  });

  describe('listIntegrations', () => {
    it('lists the environment rows', async () => {
      const amplitude = await upsertIntegration();
      const segment = await upsertIntegration({ provider: 'segment', key: 'seg-write-key' });

      const res = await graphql(app, {
        token,
        query: LIST_INTEGRATIONS,
        variables: { environmentId },
      });
      const listed = gqlData(res).listIntegrations.map((row: { id: string }) => row.id);
      expect(listed).toEqual(expect.arrayContaining([amplitude.id, segment.id]));
    });
  });

  /** Seed a logged message (with attempts) the way the pipeline would. */
  const seedMessage = async (
    integrationId: string,
    id: string,
    options: {
      status?: 'PENDING' | 'DELIVERED' | 'FAILED';
      attempts?: number;
      createdAt?: Date;
    } = {},
  ) => {
    const { status = 'DELIVERED', attempts = 1, createdAt } = options;
    return prisma.outboundMessage.create({
      data: {
        id,
        environmentId,
        integrationId,
        topic: 'event.tracked.flow_started',
        payload: {
          id,
          object: 'integrationMessage',
          type: 'event.tracked.flow_started',
          data: {},
        },
        status,
        ...(createdAt ? { createdAt } : {}),
        deliveries: {
          create: Array.from({ length: attempts }, (_, index) => ({
            attempt: index + 1,
            success: status === 'DELIVERED' && index === attempts - 1,
            responseStatus: status === 'DELIVERED' && index === attempts - 1 ? 200 : 500,
            responseBody: 'ok',
            durationMs: 12,
          })),
        },
      },
    });
  };

  describe('queryIntegrationMessages', () => {
    it('returns messages newest-first with their attempts and cursor pagination', async () => {
      const created = await upsertIntegration();
      const baseTime = Date.now();
      for (let i = 0; i < 3; i++) {
        await seedMessage(created.id, `imsg_page_${i}`, {
          status: i === 1 ? 'FAILED' : 'DELIVERED',
          attempts: i === 1 ? 5 : 1,
          createdAt: new Date(baseTime + i * 1000),
        });
      }

      const res = await graphql(app, {
        token,
        query: QUERY_MESSAGES,
        variables: { integrationId: created.id, first: 2 },
      });
      const connection = gqlData(res).queryIntegrationMessages;
      expect(connection.totalCount).toBe(3);
      expect(connection.edges).toHaveLength(2);
      expect(connection.pageInfo.hasNextPage).toBe(true);
      expect(connection.edges[0].node.id).toBe('imsg_page_2');
      expect(connection.edges[1].node.id).toBe('imsg_page_1');
      expect(connection.edges[1].node.status).toBe('FAILED');
      expect(
        connection.edges[1].node.deliveries.map(
          (delivery: { attempt: number }) => delivery.attempt,
        ),
      ).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('deleteIntegration', () => {
    it('deletes the row and cascades its message log', async () => {
      const created = await upsertIntegration();
      await seedMessage(created.id, 'imsg_e2e_cascade', { attempts: 2 });

      await graphql(app, {
        token,
        query: DELETE_INTEGRATION,
        variables: { data: { id: created.id } },
      });

      expect(await prisma.integration.findUnique({ where: { id: created.id } })).toBeNull();
      expect(await prisma.outboundMessage.count({ where: { integrationId: created.id } })).toBe(0);
      expect(
        await prisma.outboundDelivery.count({ where: { messageId: 'imsg_e2e_cascade' } }),
      ).toBe(0);
    });
  });

  describe('sendIntegrationTestEvent', () => {
    it('refuses when the integration is disabled (throws before any enqueue)', async () => {
      const created = await upsertIntegration({ enabled: false });
      const res = await graphql(app, {
        token,
        query: SEND_TEST_EVENT,
        variables: { data: { id: created.id } },
      });
      expect(res.body.errors).toBeDefined();
      expect(await prisma.outboundMessage.count({ where: { integrationId: created.id } })).toBe(0);
    });
  });

  describe('authorization', () => {
    it('denies ADMIN and VIEWER (OWNER_ONLY capabilities)', async () => {
      const admin = await buildAuthorizedUser(prisma, app, { projectId, role: 'ADMIN' });
      const viewer = await buildAuthorizedUser(prisma, app, { projectId, role: 'VIEWER' });
      userIds.push(admin.user.id, viewer.user.id);

      for (const roleToken of [admin.token, viewer.token]) {
        const listRes = await graphql(app, {
          token: roleToken,
          query: LIST_INTEGRATIONS,
          variables: { environmentId },
        });
        expect(listRes.body.errors).toBeDefined();

        const upsertRes = await graphql(app, {
          token: roleToken,
          query: UPSERT_INTEGRATION,
          variables: { data: { environmentId, provider: 'amplitude', key: 'k' } },
        });
        expect(upsertRes.body.errors).toBeDefined();
      }
    });

    it("denies another project's OWNER (cross-project isolation)", async () => {
      const created = await upsertIntegration();

      const listRes = await graphql(app, {
        token: otherOwnerToken,
        query: LIST_INTEGRATIONS,
        variables: { environmentId },
      });
      expect(listRes.body.errors).toBeDefined();

      const deleteRes = await graphql(app, {
        token: otherOwnerToken,
        query: DELETE_INTEGRATION,
        variables: { data: { id: created.id } },
      });
      expect(deleteRes.body.errors).toBeDefined();
      expect(await prisma.integration.findUnique({ where: { id: created.id } })).not.toBeNull();
    });
  });
});
