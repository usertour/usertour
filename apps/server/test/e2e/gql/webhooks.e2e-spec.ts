import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { EncryptionService } from '@/shared/encryption.service';

import { BizService } from '@/biz/biz.service';
import { graphql, gqlData } from '../auth';
import { buildBizUser, buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

// The URL-validation assertions below depend on the DEFAULT egress policy
// (public HTTPS only). `config.ts` reads ALLOW_PRIVATE_NETWORK_EGRESS at
// module-import time, so pin it before AppModule loads (lazy require, same
// pattern as the sso specs) — a developer's local `.env` with the switch on
// must not flip these tests.
const prevPrivateEgress = process.env.ALLOW_PRIVATE_NETWORK_EGRESS;
process.env.ALLOW_PRIVATE_NETWORK_EGRESS = 'false';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createTestApp } = require('../create-test-app') as typeof import('../create-test-app');

const CREATE_WEBHOOK = `mutation ($data: CreateWebhookInput!) {
  createWebhook(data: $data) { id environmentId url topics enabled description }
}`;
const UPDATE_WEBHOOK = `mutation ($data: UpdateWebhookInput!) {
  updateWebhook(data: $data) { id url topics enabled description }
}`;
const DELETE_WEBHOOK = 'mutation ($data: WebhookIdInput!) { deleteWebhook(data: $data) { id } }';
const ROTATE_SECRET =
  'mutation ($data: WebhookIdInput!) { rotateWebhookSecret(data: $data) { id secret } }';
const LIST_WEBHOOKS = `query ($environmentId: String!) {
  listWebhooks(environmentId: $environmentId) { id url topics enabled }
}`;
const GET_WEBHOOK = 'query ($id: String!) { getWebhook(id: $id) { id url secret topics } }';
const QUERY_MESSAGES = `query ($webhookId: String!, $first: Int) {
  queryWebhookMessages(webhookId: $webhookId, first: $first) {
    totalCount
    edges { node { id topic status payload deliveries { attempt success responseStatus responseBody } } }
    pageInfo { hasNextPage endCursor }
  }
}`;
const RESEND_MESSAGE = `mutation ($data: WebhookMessageInput!) {
  resendWebhookMessage(data: $data) { id status }
}`;

/**
 * Functional e2e for the `webhooks` GraphQL resolver (ADR 0010) — follows the
 * integration template: run as an authorized OWNER, assert each mutation's
 * effect in the DB. Delivery of actual HTTP requests is unit-tested at the
 * processor level; here we cover config CRUD, secret lifecycle, topic/url
 * validation, role gating (OWNER_ONLY), and cross-project isolation.
 */
describe('GraphQL webhooks (e2e)', () => {
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

    const project = await buildProject(prisma, { name: 'gql-webhooks' });
    projectId = project.id;
    // Webhooks are Starter+ on cloud (see webhooks-plan-gate.e2e-spec for the
    // gate itself). Entitle this project so the CRUD surface under test is
    // reachable whichever deployment mode the run resolves to.
    await buildSubscription(prisma, { projectId, planType: 'starter' });
    const environment = await buildEnvironment(prisma, { projectId });
    environmentId = environment.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    token = owner.token;
    userIds.push(owner.user.id);

    const otherProject = await buildProject(prisma, { name: 'gql-webhooks-other' });
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
    process.env.ALLOW_PRIVATE_NETWORK_EGRESS = prevPrivateEgress ?? '';
  });

  const createWebhook = async (overrides: Record<string, unknown> = {}) => {
    const res = await graphql(app, {
      token,
      query: CREATE_WEBHOOK,
      variables: {
        data: {
          environmentId,
          url: 'https://e2e-receiver.invalid/usertour-hook',
          topics: ['event.tracked'],
          ...overrides,
        },
      },
    });
    return gqlData(res).createWebhook;
  };

  describe('createWebhook', () => {
    it('creates an enabled endpoint with a server-generated whsec_ secret', async () => {
      const created = await createWebhook({ description: 'warehouse sync' });
      expect(created.environmentId).toBe(environmentId);
      expect(created.enabled).toBe(true);
      expect(created.topics).toEqual(['event.tracked']);

      const row = await prisma.webhook.findUnique({ where: { id: created.id } });
      // At rest the secret is AES-256-GCM ciphertext — never plaintext; the
      // decrypted value is the server-generated whsec_ the API hands out.
      expect(row?.secret).not.toMatch(/^whsec_/);
      const encryption = app.get(EncryptionService);
      expect(encryption.decrypt(row?.secret ?? '')).toMatch(/^whsec_[0-9a-f]{64}$/);
      expect(row?.description).toBe('warehouse sync');
    });

    it('rejects a non-HTTPS url', async () => {
      const res = await graphql(app, {
        token,
        query: CREATE_WEBHOOK,
        variables: {
          data: { environmentId, url: 'http://e2e-receiver.invalid/hook', topics: ['*'] },
        },
      });
      expect(res.body.errors).toBeDefined();
    });

    it('rejects an internal-host url (egress guard)', async () => {
      const res = await graphql(app, {
        token,
        query: CREATE_WEBHOOK,
        variables: {
          data: { environmentId, url: 'https://127.0.0.1/hook', topics: ['*'] },
        },
      });
      expect(res.body.errors).toBeDefined();
    });

    it('rejects invalid topic subscriptions', async () => {
      // `user.archived` is a plausible-looking name that is NOT a topic (only
      // created/updated/deleted exist for entities) — the grammar must reject
      // it rather than accept anything under a known prefix.
      for (const topics of [[], ['flow_started'], ['user.archived'], ['event.tracked.']]) {
        const res = await graphql(app, {
          token,
          query: CREATE_WEBHOOK,
          variables: {
            data: { environmentId, url: 'https://e2e-receiver.invalid/hook', topics },
          },
        });
        expect(res.body.errors).toBeDefined();
      }
    });
  });

  describe('list / get', () => {
    it('lists endpoints for the environment and exposes the secret on get only', async () => {
      const created = await createWebhook();

      const listRes = await graphql(app, {
        token,
        query: LIST_WEBHOOKS,
        variables: { environmentId },
      });
      const listed = gqlData(listRes).listWebhooks.map((row: { id: string }) => row.id);
      expect(listed).toContain(created.id);

      // Exposure rule locked at the surface: a list SELECTING the secret gets
      // NULL (masked), never plaintext — only get/create/rotate carry it,
      // and '' is reserved for "stored value no longer decryptable".
      const listSecretRes = await graphql(app, {
        token,
        query:
          'query ($environmentId: String!) { listWebhooks(environmentId: $environmentId) { id secret } }',
        variables: { environmentId },
      });
      for (const row of gqlData(listSecretRes).listWebhooks as { secret: string | null }[]) {
        expect(row.secret).toBeNull();
      }

      // Update responses are masked too — an update is not a secret handoff.
      const updateSecretRes = await graphql(app, {
        token,
        query: 'mutation ($data: UpdateWebhookInput!) { updateWebhook(data: $data) { id secret } }',
        variables: { data: { id: created.id, description: 'masked-check' } },
      });
      expect(gqlData(updateSecretRes).updateWebhook.secret).toBeNull();

      const getRes = await graphql(app, {
        token,
        query: GET_WEBHOOK,
        variables: { id: created.id },
      });
      expect(gqlData(getRes).getWebhook.secret).toMatch(/^whsec_/);
    });
  });

  describe('updateWebhook', () => {
    it('updates url, topics, enabled, and description', async () => {
      const created = await createWebhook();
      const res = await graphql(app, {
        token,
        query: UPDATE_WEBHOOK,
        variables: {
          data: {
            id: created.id,
            url: 'https://e2e-receiver.invalid/next',
            topics: ['event.tracked.flow_started', 'event.tracked.question_answered'],
            enabled: false,
            description: 'paused',
          },
        },
      });
      const updated = gqlData(res).updateWebhook;
      expect(updated.enabled).toBe(false);

      const row = await prisma.webhook.findUnique({ where: { id: created.id } });
      expect(row?.url).toBe('https://e2e-receiver.invalid/next');
      expect(row?.topics).toEqual([
        'event.tracked.flow_started',
        'event.tracked.question_answered',
      ]);
      expect(row?.description).toBe('paused');
    });

    it('changing the URL resets the circuit-breaker state; other edits keep it', async () => {
      const created = await createWebhook();
      const breakerState = {
        consecutiveFailures: 7,
        cooldownUntil: new Date(Date.now() + 30 * 60_000),
        failingSince: new Date(Date.now() - 60 * 60_000),
      };
      await prisma.webhook.update({ where: { id: created.id }, data: breakerState });

      // A non-URL edit (and echoing the SAME url) keeps the streak.
      await graphql(app, {
        token,
        query: UPDATE_WEBHOOK,
        variables: { data: { id: created.id, url: created.url, description: 'still broken' } },
      });
      let row = await prisma.webhook.findUnique({ where: { id: created.id } });
      expect(row?.consecutiveFailures).toBe(7);
      expect(row?.cooldownUntil).not.toBeNull();

      // A NEW target owes nothing to the old one's failures.
      await graphql(app, {
        token,
        query: UPDATE_WEBHOOK,
        variables: { data: { id: created.id, url: 'https://e2e-receiver.invalid/fixed' } },
      });
      row = await prisma.webhook.findUnique({ where: { id: created.id } });
      expect(row?.consecutiveFailures).toBe(0);
      expect(row?.cooldownUntil).toBeNull();
      expect(row?.failingSince).toBeNull();
    });
  });

  describe('rotateWebhookSecret', () => {
    it('replaces the secret with a fresh whsec_ value', async () => {
      const created = await createWebhook();
      const before = await prisma.webhook.findUnique({ where: { id: created.id } });

      const res = await graphql(app, {
        token,
        query: ROTATE_SECRET,
        variables: { data: { id: created.id } },
      });
      const rotated = gqlData(res).rotateWebhookSecret;
      expect(rotated.secret).toMatch(/^whsec_[0-9a-f]{64}$/);
      expect(rotated.secret).not.toBe(before?.secret);
    });
  });

  /** Seed a logged message (with attempts) the way the pipeline would. */
  const seedMessage = async (
    webhookId: string,
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
        webhookId,
        topic: 'event.tracked.flow_started',
        payload: { id, object: 'webhookMessage', type: 'event.tracked.flow_started', data: {} },
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

  describe('deleteWebhook', () => {
    it('deletes the endpoint and cascades its message log', async () => {
      const created = await createWebhook();
      await seedMessage(created.id, 'whmsg_e2e_cascade', { attempts: 2 });

      await graphql(app, { token, query: DELETE_WEBHOOK, variables: { data: { id: created.id } } });

      expect(await prisma.webhook.findUnique({ where: { id: created.id } })).toBeNull();
      expect(await prisma.outboundMessage.count({ where: { webhookId: created.id } })).toBe(0);
      expect(
        await prisma.outboundDelivery.count({ where: { messageId: 'whmsg_e2e_cascade' } }),
      ).toBe(0);
    });
  });

  describe('queryWebhookMessages', () => {
    it('returns messages newest-first with their attempts and cursor pagination', async () => {
      const created = await createWebhook();
      const baseTime = Date.now();
      for (let i = 0; i < 3; i++) {
        await seedMessage(created.id, `whmsg_page_${i}`, {
          status: i === 1 ? 'FAILED' : 'DELIVERED',
          attempts: i === 1 ? 5 : 1,
          createdAt: new Date(baseTime + i * 1000),
        });
      }

      const res = await graphql(app, {
        token,
        query: QUERY_MESSAGES,
        variables: { webhookId: created.id, first: 2 },
      });
      const connection = gqlData(res).queryWebhookMessages;
      expect(connection.totalCount).toBe(3);
      expect(connection.edges).toHaveLength(2);
      expect(connection.pageInfo.hasNextPage).toBe(true);
      // Newest first, attempts nested and ordered.
      expect(connection.edges[0].node.id).toBe('whmsg_page_2');
      expect(connection.edges[1].node.id).toBe('whmsg_page_1');
      expect(connection.edges[1].node.status).toBe('FAILED');
      expect(
        connection.edges[1].node.deliveries.map((d: { attempt: number }) => d.attempt),
      ).toEqual([1, 2, 3, 4, 5]);
      expect(connection.edges[1].node.payload.id).toBe('whmsg_page_1');
    });
  });

  describe('entity-delete emission (exact-once, native RETURNING rows)', () => {
    it('a repeated delete emits ZERO additional user.deleted messages, and the payload maps the native row', async () => {
      // A webhook subscribed to the user family so the listener records the
      // emission into the outbound ledger.
      const endpoint = await createWebhook({
        url: 'https://e2e-receiver.invalid/delete-probe',
        topics: ['user'],
      });
      const bizUser = await buildBizUser(prisma, { environmentId });
      const bizService = app.get(BizService);

      await bizService.deleteBizUser([bizUser.id], environmentId);
      // The emit is post-commit and async — give the listener a beat.
      await new Promise((resolve) => setTimeout(resolve, 300));

      const afterFirst = await prisma.outboundMessage.findMany({
        where: { webhookId: endpoint.id, topic: 'user.deleted' },
      });
      // Guards the RETURNING refactor: swap it back to deleteMany and no
      // deletedRow reaches the payload with real column types.
      expect(afterFirst).toHaveLength(1);
      const payload = afterFirst[0].payload as {
        data: { user: { id: string; createdAt: string } };
      };
      expect(payload.data.user.id).toBe(bizUser.externalId);
      // Native-SQL rows must round-trip Date columns: an ISO string here
      // proves the pg driver's Date reached mapUser intact.
      expect(new Date(payload.data.user.createdAt).toISOString()).toBe(payload.data.user.createdAt);

      // Second delete of the same id: the in-transaction snapshot sees no
      // rows — it must throw AND emit nothing (the old pre-read snapshot
      // emitted a second, differently-id'd duplicate here).
      await expect(bizService.deleteBizUser([bizUser.id], environmentId)).rejects.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 300));
      const afterSecond = await prisma.outboundMessage.count({
        where: { webhookId: endpoint.id, topic: 'user.deleted' },
      });
      expect(afterSecond).toBe(1);
    });
  });

  describe('resendWebhookMessage', () => {
    it('re-queues a logged message and resets it to PENDING', async () => {
      const created = await createWebhook();
      await seedMessage(created.id, 'whmsg_resend', { status: 'FAILED', attempts: 5 });

      const res = await graphql(app, {
        token,
        query: RESEND_MESSAGE,
        variables: { data: { webhookId: created.id, messageId: 'whmsg_resend' } },
      });
      expect(gqlData(res).resendWebhookMessage).toEqual({ id: 'whmsg_resend', status: 'PENDING' });
      const row = await prisma.outboundMessage.findUnique({ where: { id: 'whmsg_resend' } });
      expect(row?.status).toBe('PENDING');
    });

    it('refuses to resend a message that is still PENDING (CAS claim loses)', async () => {
      const created = await createWebhook();
      await seedMessage(created.id, 'whmsg_pending', { status: 'PENDING', attempts: 1 });

      const res = await graphql(app, {
        token,
        query: RESEND_MESSAGE,
        variables: { data: { webhookId: created.id, messageId: 'whmsg_pending' } },
      });
      expect(res.body.errors).toBeDefined();
      const row = await prisma.outboundMessage.findUnique({ where: { id: 'whmsg_pending' } });
      expect(row?.status).toBe('PENDING');
    });

    it('refuses a message that belongs to a different endpoint', async () => {
      const first = await createWebhook();
      const second = await createWebhook({ url: 'https://e2e-receiver.invalid/other' });
      await seedMessage(second.id, 'whmsg_other_owner');

      const res = await graphql(app, {
        token,
        query: RESEND_MESSAGE,
        variables: { data: { webhookId: first.id, messageId: 'whmsg_other_owner' } },
      });
      expect(res.body.errors).toBeDefined();
      const row = await prisma.outboundMessage.findUnique({ where: { id: 'whmsg_other_owner' } });
      expect(row?.status).toBe('DELIVERED');
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
          query: LIST_WEBHOOKS,
          variables: { environmentId },
        });
        expect(listRes.body.errors).toBeDefined();

        const createRes = await graphql(app, {
          token: roleToken,
          query: CREATE_WEBHOOK,
          variables: {
            data: { environmentId, url: 'https://e2e-receiver.invalid/hook', topics: ['*'] },
          },
        });
        expect(createRes.body.errors).toBeDefined();
      }
    });

    it("denies another project's OWNER (cross-project isolation)", async () => {
      const created = await createWebhook();

      const getRes = await graphql(app, {
        token: otherOwnerToken,
        query: GET_WEBHOOK,
        variables: { id: created.id },
      });
      expect(getRes.body.errors).toBeDefined();

      const updateRes = await graphql(app, {
        token: otherOwnerToken,
        query: UPDATE_WEBHOOK,
        variables: { data: { id: created.id, enabled: false } },
      });
      expect(updateRes.body.errors).toBeDefined();

      const listRes = await graphql(app, {
        token: otherOwnerToken,
        query: LIST_WEBHOOKS,
        variables: { environmentId },
      });
      expect(listRes.body.errors).toBeDefined();
    });
  });
});
