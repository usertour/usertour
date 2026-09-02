import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { buildBizCompany, buildEnvironment, buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * `POST /v2/.../events` — server-side event ingestion. Asserts the
 * auto-registration semantics (bare user, event definition, attribute
 * allowlist), the reserved-name guard, and best-effort company linkage.
 */
describe('OpenAPI v2 track event (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let environmentId: string;
  let apiToken: string;
  let companyId: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  const track = (body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post(`/v2/projects/${projectId}/environments/${environmentId}/events`)
      .set('Authorization', `Bearer ${apiToken}`)
      .send(body);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'track-e2e' });
    projectId = project.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
    environmentId = (await buildEnvironment(prisma, { projectId })).id;
    companyId = (await buildBizCompany(prisma, { environmentId, externalId: 'track-co-1' }))
      .externalId;

    const res = await graphql(app, {
      query: CREATE,
      variables: {
        input: {
          name: 'track-e2e',
          scopes: [Capability.UserWrite],
          projectIds: [projectId],
          environmentIds: [environmentId],
        },
      },
      token: ownerToken,
    });
    apiToken = gqlData(res).createApiToken.token;
  }, 60000);

  afterAll(async () => {
    if (prisma && projectId) {
      await prisma.apiTokenOnProject.deleteMany({ where: { projectId } });
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  it('records an event, creating the user and the definition on first sight', async () => {
    const res = await track({
      userId: 'track-user-1',
      name: 'subscription_activated',
      attributes: { plan_name: 'plus', plan_price: 199 },
    });
    expect(res.status).toBe(201);
    expect(res.body.object).toBe('event');
    expect(res.body.codeName).toBe('subscription_activated');
    expect(res.body.userId).toBe('track-user-1');
    expect(res.body.attributes).toMatchObject({ plan_name: 'plus', plan_price: 199 });

    // The user was created bare; the definition auto-registered (not predefined)
    // with the attribute names linked onto it.
    const bizUser = await prisma.bizUser.findFirst({
      where: { environmentId, externalId: 'track-user-1' },
    });
    expect(bizUser?.data).toEqual({});
    const definition = await prisma.event.findFirst({
      where: { projectId, codeName: 'subscription_activated' },
    });
    expect(definition?.predefined).toBe(false);
    const linkedAttributes = await prisma.attributeOnEvent.findMany({
      where: { eventId: definition?.id },
      include: { attribute: { select: { codeName: true } } },
    });
    expect(linkedAttributes.map((row) => row.attribute.codeName).sort()).toEqual([
      'plan_name',
      'plan_price',
    ]);

    // Events are a stream — a second track appends, never deduplicates.
    expect((await track({ userId: 'track-user-1', name: 'subscription_activated' })).status).toBe(
      201,
    );
    expect(await prisma.bizEvent.count({ where: { eventId: definition?.id as string } })).toBe(2);
  });

  it('refuses built-in event names', async () => {
    const res = await track({ userId: 'track-user-1', name: 'flow_completed' });
    expect(res.status).toBe(400);
  });

  it('links a known company and ignores an unknown one', async () => {
    const linked = await track({
      userId: 'track-user-2',
      companyId,
      name: 'seat_added',
    });
    expect(linked.status).toBe(201);
    expect(linked.body.companyId).toBe(companyId);

    const unlinked = await track({
      userId: 'track-user-2',
      companyId: 'no-such-company',
      name: 'seat_added',
    });
    expect(unlinked.status).toBe(201);
    expect(unlinked.body.companyId).toBeNull();
  });

  it('honors occurredAt', async () => {
    const res = await track({
      userId: 'track-user-1',
      name: 'subscription_activated',
      occurredAt: '2026-01-15T10:00:00.000Z',
    });
    expect(res.status).toBe(201);
    expect(res.body.createdAt).toBe('2026-01-15T10:00:00.000Z');
  });
});
