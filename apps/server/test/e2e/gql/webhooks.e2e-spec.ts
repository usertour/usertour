import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildEnvironment, buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

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
const QUERY_DELIVERIES = `query ($webhookId: String!, $first: Int) {
  queryWebhookDeliveries(webhookId: $webhookId, first: $first) {
    totalCount
    edges { node { id topic attempt success responseStatus } }
    pageInfo { hasNextPage endCursor }
  }
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
  });

  const createWebhook = async (overrides: Record<string, unknown> = {}) => {
    const res = await graphql(app, {
      token,
      query: CREATE_WEBHOOK,
      variables: {
        data: {
          environmentId,
          url: 'https://example.com/usertour-hook',
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
      expect(row?.secret).toMatch(/^whsec_[0-9a-f]{64}$/);
      expect(row?.description).toBe('warehouse sync');
    });

    it('rejects a non-HTTPS url', async () => {
      const res = await graphql(app, {
        token,
        query: CREATE_WEBHOOK,
        variables: {
          data: { environmentId, url: 'http://example.com/hook', topics: ['*'] },
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
      for (const topics of [[], ['flow_started'], ['user.updated'], ['event.tracked.']]) {
        const res = await graphql(app, {
          token,
          query: CREATE_WEBHOOK,
          variables: {
            data: { environmentId, url: 'https://example.com/hook', topics },
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
            url: 'https://example.com/next',
            topics: ['event.tracked.flow_started', 'event.tracked.question_answered'],
            enabled: false,
            description: 'paused',
          },
        },
      });
      const updated = gqlData(res).updateWebhook;
      expect(updated.enabled).toBe(false);

      const row = await prisma.webhook.findUnique({ where: { id: created.id } });
      expect(row?.url).toBe('https://example.com/next');
      expect(row?.topics).toEqual([
        'event.tracked.flow_started',
        'event.tracked.question_answered',
      ]);
      expect(row?.description).toBe('paused');
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

  describe('deleteWebhook', () => {
    it('deletes the endpoint and cascades its delivery log', async () => {
      const created = await createWebhook();
      await prisma.webhookDelivery.create({
        data: {
          webhookId: created.id,
          messageId: 'whmsg_e2e',
          topic: 'event.tracked.flow_started',
          attempt: 1,
          success: true,
          responseStatus: 200,
          durationMs: 12,
        },
      });

      await graphql(app, { token, query: DELETE_WEBHOOK, variables: { data: { id: created.id } } });

      expect(await prisma.webhook.findUnique({ where: { id: created.id } })).toBeNull();
      expect(await prisma.webhookDelivery.count({ where: { webhookId: created.id } })).toBe(0);
    });
  });

  describe('queryWebhookDeliveries', () => {
    it('returns delivery rows newest-first with cursor pagination', async () => {
      const created = await createWebhook();
      const baseTime = Date.now();
      for (let i = 0; i < 3; i++) {
        await prisma.webhookDelivery.create({
          data: {
            webhookId: created.id,
            messageId: `whmsg_page_${i}`,
            topic: 'event.tracked.flow_started',
            attempt: 1,
            success: i !== 1,
            responseStatus: i === 1 ? 500 : 200,
            createdAt: new Date(baseTime + i * 1000),
          },
        });
      }

      const res = await graphql(app, {
        token,
        query: QUERY_DELIVERIES,
        variables: { webhookId: created.id, first: 2 },
      });
      const connection = gqlData(res).queryWebhookDeliveries;
      expect(connection.totalCount).toBe(3);
      expect(connection.edges).toHaveLength(2);
      expect(connection.pageInfo.hasNextPage).toBe(true);
      // Newest first.
      expect(connection.edges[0].node.id).not.toBe(connection.edges[1].node.id);
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
            data: { environmentId, url: 'https://example.com/hook', topics: ['*'] },
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
