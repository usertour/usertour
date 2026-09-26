import { INestApplication } from '@nestjs/common';
import { Capability, ClientMessageKind } from '@usertour/types';
import { bucketValue } from '@usertour/helpers';
import { Job } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { AttributeBackfillProcessor } from '@/modules/attributes/processors/attribute-backfill.processor';
import { gqlData, graphql } from '../auth';
import { buildAuthorizedUser } from '../gql/_support';
import { OpenApiFixture, seedApiFixture, teardownApiFixture } from '../openapi';
import {
  WebSocketTestApp,
  connectWebSocketClient,
  createWebSocketTestApp,
} from '../web-socket/_support';

/**
 * Random bucketing attributes end to end (ADR 0020): definitions are created
 * through v2 with their rules, a user born afterwards carries the derived
 * values, a user born before is backfilled, values are refused on write —
 * and the SDK acknowledgement names the refused key.
 */
describe('Random bucketing attributes (e2e)', () => {
  let harness: WebSocketTestApp;
  let app: INestApplication;
  let prisma: PrismaService;
  let fx: OpenApiFixture;
  let ownerUserId: string;
  let token: string;
  let environmentToken: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  const definitions = () => `/v2/projects/${fx.projectId}/attribute-definitions`;
  const users = (id: string) =>
    `/v2/projects/${fx.projectId}/environments/${fx.environmentId}/users/${id}`;
  const send = (method: 'post' | 'patch' | 'put', path: string) =>
    request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    harness = await createWebSocketTestApp();
    app = harness.app;
    prisma = app.get(PrismaService);
    fx = await seedApiFixture(prisma, { projectName: 'api-v2-random-bucketing' });
    const environment = await prisma.environment.findUniqueOrThrow({
      where: { id: fx.environmentId },
    });
    environmentToken = environment.token;
    const owner = await buildAuthorizedUser(prisma, app, {
      projectId: fx.projectId,
      role: 'OWNER',
    });
    ownerUserId = owner.user.id;
    const minted = await graphql(app, {
      query: CREATE,
      variables: {
        input: {
          name: 'random-bucketing',
          scopes: [
            Capability.AttributeCreate,
            Capability.AttributeUpdate,
            Capability.AttributeRead,
            Capability.UserWrite,
            Capability.UserRead,
          ],
          projectIds: [fx.projectId],
          environmentIds: [fx.environmentId],
        },
      },
      token: owner.token,
    });
    token = gqlData(minted).createApiToken.token;
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await prisma.userOnProject.deleteMany({ where: { projectId: fx.projectId } });
      await teardownApiFixture(prisma, fx);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await harness?.close();
  });

  let experimentId: string;
  let rolloutId: string;

  describe('definitions', () => {
    it('creates a Random A/B and a Random number attribute', async () => {
      const ab = await send('post', definitions()).send({
        scope: 'user',
        dataType: 'random_ab',
        codeName: 'experiment',
        displayName: 'Experiment',
      });
      expect(ab.status).toBe(201);
      expect(ab.body).toMatchObject({ dataType: 'random_ab', randomMax: null });
      experimentId = ab.body.id;

      const rollout = await send('post', definitions()).send({
        scope: 'user',
        dataType: 'random_number',
        codeName: 'rollout',
        displayName: 'Rollout',
        randomMax: 100,
      });
      expect(rollout.status).toBe(201);
      expect(rollout.body).toMatchObject({ dataType: 'random_number', randomMax: 100 });
      rolloutId = rollout.body.id;
    });

    it('requires an upper bound for a Random number and refuses membership scope', async () => {
      const noBound = await send('post', definitions()).send({
        scope: 'user',
        dataType: 'random_number',
        codeName: 'no_bound',
        displayName: 'No bound',
      });
      expect(noBound.status).toBe(400);

      const membership = await send('post', definitions()).send({
        scope: 'companyMembership',
        dataType: 'random_ab',
        codeName: 'member_split',
        displayName: 'Member split',
      });
      expect(membership.status).toBe(400);
    });

    it('locks the type in both directions', async () => {
      const intoString = await send('patch', `${definitions()}/${experimentId}`).send({
        dataType: 'string',
      });
      expect(intoString.status).toBe(400);

      const plain = await send('post', definitions()).send({
        scope: 'user',
        dataType: 'string',
        codeName: 'plain_plan',
        displayName: 'Plan',
      });
      const intoRandom = await send('patch', `${definitions()}/${plain.body.id}`).send({
        dataType: 'random_ab',
      });
      expect(intoRandom.status).toBe(400);
    });
  });

  describe('values', () => {
    it('a user born after the definitions carries both values, derived and stable', async () => {
      const first = await send('put', users('rb-born-after')).send({ attributes: { plan: 'pro' } });
      expect(first.status).toBe(200);
      const { experiment, rollout } = first.body.attributes;
      expect(['A', 'B']).toContain(experiment);
      expect(Number.isInteger(rollout)).toBe(true);
      expect(rollout).toBeGreaterThanOrEqual(1);
      expect(rollout).toBeLessThanOrEqual(100);
      expect(experiment).toBe(bucketValue({ id: experimentId, dataType: 6 }, 'rb-born-after'));
      expect(rollout).toBe(
        bucketValue({ id: rolloutId, dataType: 7, randomMax: 100 }, 'rb-born-after'),
      );

      const second = await send('put', users('rb-born-after')).send({
        attributes: { plan: 'free' },
      });
      expect(second.body.attributes).toMatchObject({ experiment, rollout, plan: 'free' });
    });

    it('a user born before a definition is backfilled by the job, idempotently', async () => {
      await send('put', users('rb-born-before')).send({ attributes: { plan: 'pro' } });
      const created = await send('post', definitions()).send({
        scope: 'user',
        dataType: 'random_number',
        codeName: 'late_rollout',
        displayName: 'Late rollout',
        randomMax: 10,
      });
      expect(created.status).toBe(201);
      const attributeId = created.body.id;

      const processor = app.get(AttributeBackfillProcessor);
      await processor.process({ data: { attributeId } } as Job);

      const row = await prisma.bizUser.findFirst({
        where: { environmentId: fx.environmentId, externalId: 'rb-born-before' },
      });
      const data = row?.data as Record<string, unknown>;
      expect(data.late_rollout).toBe(
        bucketValue({ id: attributeId, dataType: 7, randomMax: 10 }, 'rb-born-before'),
      );
      expect(data.plan).toBe('pro');

      await processor.process({ data: { attributeId } } as Job);
      const again = await prisma.bizUser.findFirst({
        where: { environmentId: fx.environmentId, externalId: 'rb-born-before' },
      });
      expect(again?.data).toEqual(row?.data);
    });

    it('refuses a write through v2 with a reason that names the cause', async () => {
      const res = await send('put', users('rb-born-after')).send({
        attributes: { experiment: 'C' },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/system-generated/);
    });

    it('drops the key on the SDK path and names it in the acknowledgement', async () => {
      const client = await connectWebSocketClient(harness.baseUrl, {
        token: environmentToken,
        externalUserId: 'rb-born-after',
      });
      const ack = await client.sendClientMessage(ClientMessageKind.UPSERT_USER, {
        externalUserId: 'rb-born-after',
        attributes: { experiment: 'C', rollout: 999, name: 'Still written' },
      });
      expect(ack).toMatchObject({
        ok: true,
        rejected: [
          { codeName: 'experiment', reason: expect.stringMatching(/system-generated/) },
          { codeName: 'rollout', reason: expect.stringMatching(/system-generated/) },
        ],
      });
      client.disconnect();

      const row = await prisma.bizUser.findFirst({
        where: { environmentId: fx.environmentId, externalId: 'rb-born-after' },
      });
      const data = row?.data as Record<string, unknown>;
      expect(data.name).toBe('Still written');
      expect(['A', 'B']).toContain(data.experiment);
      expect(data.rollout).not.toBe(999);
    });
  });
});
