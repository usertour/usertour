import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { EncryptionService } from '@/shared/encryption.service';

import { graphql, gqlData, gqlErrorCode } from '../auth';
import { buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

// The webhooks plan gate resolves via subscription only in SaaS mode (self-hosted
// forces the flag on), and `config.ts` reads `IS_SELF_HOSTED_MODE` at module-import
// time. Force SaaS mode before AppModule (and thus config.ts) loads — hence the
// lazy require below. Jest isolates each spec file in its own worker, so this
// does not leak into the self-hosted-mode webhooks CRUD spec.
const prevSelfHosted = process.env.IS_SELF_HOSTED_MODE;
process.env.IS_SELF_HOSTED_MODE = 'false';
// Pin the default egress policy too — the https fixtures below must stay valid
// regardless of the developer's local ALLOW_PRIVATE_NETWORK_EGRESS.
const prevPrivateEgress = process.env.ALLOW_PRIVATE_NETWORK_EGRESS;
process.env.ALLOW_PRIVATE_NETWORK_EGRESS = 'false';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createTestApp } = require('../create-test-app') as typeof import('../create-test-app');

const CREATE_WEBHOOK = `mutation ($data: CreateWebhookInput!) {
  createWebhook(data: $data) { id environmentId }
}`;
const UPDATE_WEBHOOK = `mutation ($data: UpdateWebhookInput!) {
  updateWebhook(data: $data) { id enabled }
}`;
const DELETE_WEBHOOK = 'mutation ($data: WebhookIdInput!) { deleteWebhook(data: $data) { id } }';
const ROTATE_SECRET =
  'mutation ($data: WebhookIdInput!) { rotateWebhookSecret(data: $data) { id secret } }';
const SEND_TEST_EVENT =
  'mutation ($data: WebhookIdInput!) { sendWebhookTestEvent(data: $data) { id } }';
const LIST_WEBHOOKS = `query ($environmentId: String!) {
  listWebhooks(environmentId: $environmentId) { id url }
}`;

/**
 * Plan gate for outbound webhooks on cloud: Starter and above may use them,
 * Hobby (no subscription) may not. Writes and actions throw E0043; reads and
 * delete stay open so a downgraded project can still see and clean up what it
 * configured. Self-hosted is covered by the main webhooks spec (never gated).
 */
describe('GraphQL webhooks plan gate (e2e, SaaS mode)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const userIds: string[] = [];

  // Starter subscription → entitled.
  let starterProjectId: string;
  let starterEnvironmentId: string;
  let starterToken: string;

  // No subscription → Hobby → not entitled.
  let hobbyProjectId: string;
  let hobbyEnvironmentId: string;
  let hobbyToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const starter = await buildProject(prisma, { name: 'gql-webhooks-starter' });
    starterProjectId = starter.id;
    await buildSubscription(prisma, { projectId: starterProjectId, planType: 'starter' });
    starterEnvironmentId = (await buildEnvironment(prisma, { projectId: starterProjectId })).id;
    const starterOwner = await buildAuthorizedUser(prisma, app, {
      projectId: starterProjectId,
      role: 'OWNER',
    });
    starterToken = starterOwner.token;

    const hobby = await buildProject(prisma, { name: 'gql-webhooks-hobby' });
    hobbyProjectId = hobby.id;
    hobbyEnvironmentId = (await buildEnvironment(prisma, { projectId: hobbyProjectId })).id;
    const hobbyOwner = await buildAuthorizedUser(prisma, app, {
      projectId: hobbyProjectId,
      role: 'OWNER',
    });
    hobbyToken = hobbyOwner.token;

    userIds.push(starterOwner.user.id, hobbyOwner.user.id);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await teardownProject(prisma, starterProjectId);
      await teardownProject(prisma, hobbyProjectId);
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
    process.env.IS_SELF_HOSTED_MODE = prevSelfHosted ?? '';
    process.env.ALLOW_PRIVATE_NETWORK_EGRESS = prevPrivateEgress ?? '';
  });

  const createInput = (environmentId: string) => ({
    data: {
      environmentId,
      url: 'https://e2e-receiver.invalid/usertour-hook',
      topics: ['event.tracked'],
    },
  });

  it('lets a Starter project create a webhook', async () => {
    const res = await graphql(app, {
      token: starterToken,
      query: CREATE_WEBHOOK,
      variables: createInput(starterEnvironmentId),
    });
    expect(gqlData(res).createWebhook.environmentId).toBe(starterEnvironmentId);
  });

  it('refuses creation on a Hobby project (E0043)', async () => {
    const res = await graphql(app, {
      token: hobbyToken,
      query: CREATE_WEBHOOK,
      variables: createInput(hobbyEnvironmentId),
    });
    expect(gqlErrorCode(res)).toBe('E0043');
    expect(await prisma.webhook.count({ where: { environmentId: hobbyEnvironmentId } })).toBe(0);
  });

  describe('a Hobby project holding a webhook from before its plan lapsed', () => {
    let webhookId: string;
    let seededCiphertext: string;

    beforeAll(async () => {
      // Secrets are encrypted at rest; a direct seed must encrypt like the
      // domain service does, or every read path would fail decryption.
      const encryption = app.get(EncryptionService);
      seededCiphertext = encryption.encrypt('whsec_legacy') as string;
      const row = await prisma.webhook.create({
        data: {
          environmentId: hobbyEnvironmentId,
          url: 'https://e2e-receiver.invalid/legacy-hook',
          topics: ['*'],
          enabled: true,
          secret: seededCiphertext,
        },
      });
      webhookId = row.id;
    });

    it('can still list it', async () => {
      const res = await graphql(app, {
        token: hobbyToken,
        query: LIST_WEBHOOKS,
        variables: { environmentId: hobbyEnvironmentId },
      });
      expect(gqlData(res).listWebhooks.map((webhook: { id: string }) => webhook.id)).toContain(
        webhookId,
      );
    });

    it('cannot update, rotate, or test it (E0043)', async () => {
      const update = await graphql(app, {
        token: hobbyToken,
        query: UPDATE_WEBHOOK,
        variables: { data: { id: webhookId, enabled: false } },
      });
      expect(gqlErrorCode(update)).toBe('E0043');

      const rotate = await graphql(app, {
        token: hobbyToken,
        query: ROTATE_SECRET,
        variables: { data: { id: webhookId } },
      });
      expect(gqlErrorCode(rotate)).toBe('E0043');

      const test = await graphql(app, {
        token: hobbyToken,
        query: SEND_TEST_EVENT,
        variables: { data: { id: webhookId } },
      });
      expect(gqlErrorCode(test)).toBe('E0043');

      const row = await prisma.webhook.findUnique({ where: { id: webhookId } });
      expect(row?.enabled).toBe(true);
      // Byte-identical ciphertext = the E0043-refused rotate never wrote.
      expect(row?.secret).toBe(seededCiphertext);
    });

    it('can still delete it', async () => {
      const res = await graphql(app, {
        token: hobbyToken,
        query: DELETE_WEBHOOK,
        variables: { data: { id: webhookId } },
      });
      expect(gqlData(res).deleteWebhook.id).toBe(webhookId);
      expect(await prisma.webhook.findUnique({ where: { id: webhookId } })).toBeNull();
    });
  });
});
