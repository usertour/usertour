import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { EncryptionService } from '@/shared/encryption.service';

import { graphql, gqlData, gqlErrorCode } from '../auth';
import { buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

// The integrations plan gate resolves via subscription only in SaaS mode
// (self-hosted forces the flag on), and `config.ts` reads `IS_SELF_HOSTED_MODE`
// at module-import time. Force SaaS mode before AppModule loads — hence the
// lazy require. Jest isolates each spec file in its own worker.
const prevSelfHosted = process.env.IS_SELF_HOSTED_MODE;
process.env.IS_SELF_HOSTED_MODE = 'false';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createTestApp } = require('../create-test-app') as typeof import('../create-test-app');

const UPSERT_INTEGRATION = `mutation ($data: UpsertIntegrationInput!) {
  upsertIntegration(data: $data) { id environmentId }
}`;
const DELETE_INTEGRATION =
  'mutation ($data: IntegrationIdInput!) { deleteIntegration(data: $data) { id } }';
const SEND_TEST_EVENT =
  'mutation ($data: IntegrationIdInput!) { sendIntegrationTestEvent(data: $data) { id } }';
const LIST_INTEGRATIONS = `query ($environmentId: String!) {
  listIntegrations(environmentId: $environmentId) { id provider }
}`;

/**
 * Plan gate for outbound integrations on cloud (ADR 0011 §7): Starter and
 * above may use them, Hobby may not. Writes and actions throw E0043; reads
 * and delete stay open so a downgraded project can clean up. Self-hosted is
 * covered by the main integrations spec (never gated).
 */
describe('GraphQL integrations plan gate (e2e, SaaS mode)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const userIds: string[] = [];

  let starterProjectId: string;
  let starterEnvironmentId: string;
  let starterToken: string;

  let hobbyProjectId: string;
  let hobbyEnvironmentId: string;
  let hobbyToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const starter = await buildProject(prisma, { name: 'gql-integrations-starter' });
    starterProjectId = starter.id;
    await buildSubscription(prisma, { projectId: starterProjectId, planType: 'starter' });
    starterEnvironmentId = (await buildEnvironment(prisma, { projectId: starterProjectId })).id;
    const starterOwner = await buildAuthorizedUser(prisma, app, {
      projectId: starterProjectId,
      role: 'OWNER',
    });
    starterToken = starterOwner.token;

    const hobby = await buildProject(prisma, { name: 'gql-integrations-hobby' });
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
  });

  const upsertInput = (environmentId: string) => ({
    data: { environmentId, provider: 'amplitude', key: 'amp-key' },
  });

  it('lets a Starter project configure an integration', async () => {
    const res = await graphql(app, {
      token: starterToken,
      query: UPSERT_INTEGRATION,
      variables: upsertInput(starterEnvironmentId),
    });
    expect(gqlData(res).upsertIntegration.environmentId).toBe(starterEnvironmentId);
  });

  it('refuses configuration on a Hobby project (E0043)', async () => {
    const res = await graphql(app, {
      token: hobbyToken,
      query: UPSERT_INTEGRATION,
      variables: upsertInput(hobbyEnvironmentId),
    });
    expect(gqlErrorCode(res)).toBe('E0043');
    expect(await prisma.integration.count({ where: { environmentId: hobbyEnvironmentId } })).toBe(
      0,
    );
  });

  describe('a Hobby project holding an integration from before its plan lapsed', () => {
    let integrationId: string;
    let seededCiphertext: string;

    beforeAll(async () => {
      // Keys are encrypted at rest; a direct seed must encrypt like the
      // domain service does.
      const encryption = app.get(EncryptionService);
      seededCiphertext = encryption.encrypt('legacy-key') as string;
      const row = await prisma.integration.create({
        data: {
          environmentId: hobbyEnvironmentId,
          provider: 'mixpanel',
          key: seededCiphertext,
          keyTail: '-key',
          enabled: true,
        },
      });
      integrationId = row.id;
    });

    it('can still list it', async () => {
      const res = await graphql(app, {
        token: hobbyToken,
        query: LIST_INTEGRATIONS,
        variables: { environmentId: hobbyEnvironmentId },
      });
      expect(gqlData(res).listIntegrations.map((row: { id: string }) => row.id)).toContain(
        integrationId,
      );
    });

    it('cannot reconfigure or test it (E0043)', async () => {
      const upsert = await graphql(app, {
        token: hobbyToken,
        query: UPSERT_INTEGRATION,
        variables: {
          data: { environmentId: hobbyEnvironmentId, provider: 'mixpanel', enabled: false },
        },
      });
      expect(gqlErrorCode(upsert)).toBe('E0043');

      const test = await graphql(app, {
        token: hobbyToken,
        query: SEND_TEST_EVENT,
        variables: { data: { id: integrationId } },
      });
      expect(gqlErrorCode(test)).toBe('E0043');

      const row = await prisma.integration.findUnique({ where: { id: integrationId } });
      expect(row?.enabled).toBe(true);
      // Byte-identical ciphertext = the refused writes never touched the key.
      expect(row?.key).toBe(seededCiphertext);
    });

    it('can still delete it', async () => {
      const res = await graphql(app, {
        token: hobbyToken,
        query: DELETE_INTEGRATION,
        variables: { data: { id: integrationId } },
      });
      expect(gqlData(res).deleteIntegration.id).toBe(integrationId);
      expect(await prisma.integration.findUnique({ where: { id: integrationId } })).toBeNull();
    });
  });
});
