import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildBizCompany,
  buildBizUser,
  buildEnvironment,
  buildProject,
  buildSegment,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Contract test for the v2 segments resource: project-level definitions
 * (list/get/create/update/delete) + env-level manual membership (add/remove).
 */
describe('API v2 segments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let environmentId: string;
  let allSegmentId: string;
  const memberExternalId = 'bu-seg-jane';

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  async function mint(scopes: Capability[], environmentIds?: string[]): Promise<string> {
    const res = await graphql(app, {
      query: CREATE,
      variables: {
        // Env-targeted scopes must NAME environments (server rule) — default to the suite env.
        input: {
          name: 'k',
          scopes,
          projectIds: [projectId],
          environmentIds: environmentIds ?? [environmentId],
        },
      },
      token: ownerToken,
    });
    return gqlData(res).createApiToken.token;
  }

  function api(method: 'get', path: string, token: string) {
    return request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);
  }
  const send = (method: 'post' | 'patch' | 'delete' | 'put', path: string, token: string) =>
    request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);

  const segPath = () => `/v2/projects/${projectId}/segments`;
  const memberPath = (segId: string) =>
    `/v2/projects/${projectId}/environments/${environmentId}/segments/${segId}/members`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-segments' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    // Built-in "all" user segment (dataType 1) — immutable via the API.
    allSegmentId = (
      await buildSegment(prisma, {
        projectId,
        environmentId,
        name: 'All users',
        bizType: 1,
        dataType: 1,
      })
    ).id;
    await buildBizUser(prisma, {
      environmentId,
      externalId: memberExternalId,
      data: { name: 'Jane' },
    });
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await prisma.userOnProject.deleteMany({ where: { projectId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  it('creates condition + manual segments; lists and filters by bizType', async () => {
    const token = await mint([Capability.SegmentCreate, Capability.SegmentRead]);

    const cond = await send('post', segPath(), token).send({
      name: 'Power users',
      bizType: 'user',
      kind: 'condition',
      conditions: [], // codec wiring; condition fidelity covered by the codec specs
    });
    expect(cond.status).toBe(201);
    expect(cond.body).toMatchObject({
      object: 'segment',
      name: 'Power users',
      bizType: 'user',
      kind: 'condition',
      conditions: [],
    });

    const manual = await send('post', segPath(), token).send({
      name: 'VIPs',
      bizType: 'company',
      kind: 'manual',
    });
    expect(manual.status).toBe(201);
    expect(manual.body).toMatchObject({ kind: 'manual', bizType: 'company' });
    expect(manual.body.conditions).toBeUndefined();

    const list = await api('get', `${segPath()}?bizType=user`, token);
    expect(list.status).toBe(200);
    const userKinds = list.body.results.map((s: { bizType: string }) => s.bizType);
    expect(userKinds.every((b: string) => b === 'user')).toBe(true);
    expect(list.body.results.map((s: { id: string }) => s.id)).toContain(cond.body.id);
    expect(list.body.results.map((s: { id: string }) => s.id)).not.toContain(manual.body.id); // company
  });

  it('gets a segment; 404 for unknown (E1025)', async () => {
    const token = await mint([Capability.SegmentRead]);
    const ok = await api('get', `${segPath()}/${allSegmentId}`, token);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ id: allSegmentId, object: 'segment', kind: 'all' });

    const no = await api('get', `${segPath()}/nope`, token);
    expect(no.status).toBe(404);
    expect(no.body.error.code).toBe('E1025');
  });

  it('updates name; rejects conditions on a manual segment (400)', async () => {
    const token = await mint([
      Capability.SegmentCreate,
      Capability.SegmentUpdate,
      Capability.SegmentRead,
    ]);
    const created = await send('post', segPath(), token).send({
      name: 'Editable',
      bizType: 'user',
      kind: 'manual',
    });
    const id = created.body.id;

    const renamed = await send('patch', `${segPath()}/${id}`, token).send({ name: 'Renamed' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe('Renamed');

    const badConds = await send('patch', `${segPath()}/${id}`, token).send({ conditions: [] });
    expect(badConds.status).toBe(400);
    expect(badConds.body.error.code).toBe('E1017');
  });

  it('rejects a non-attribute condition type in a segment (400 E1017)', async () => {
    const token = await mint([
      Capability.SegmentCreate,
      Capability.SegmentUpdate,
      Capability.SegmentRead,
    ]);
    // Segments only evaluate attribute conditions; an event condition would be
    // silently skipped at membership time and match EVERY user — reject it at write.
    const evt = await send('post', segPath(), token).send({
      name: 'Event seg',
      bizType: 'user',
      kind: 'condition',
      conditions: [{ type: 'event', event: 'whatever' }],
    });
    expect(evt.status).toBe(400);
    expect(evt.body.error.code).toBe('E1017');

    // ... and on update: a current_url condition is equally unevaluable for a segment.
    const ok = await send('post', segPath(), token).send({
      name: 'Attr seg',
      bizType: 'user',
      kind: 'condition',
      conditions: [],
    });
    const upd = await send('patch', `${segPath()}/${ok.body.id}`, token).send({
      conditions: [{ type: 'current_url', includes: ['*'] }],
    });
    expect(upd.status).toBe(400);
    expect(upd.body.error.code).toBe('E1017');
  });

  it('deletes a segment (204), then 404', async () => {
    const token = await mint([
      Capability.SegmentCreate,
      Capability.SegmentDelete,
      Capability.SegmentRead,
    ]);
    const created = await send('post', segPath(), token).send({
      name: 'ToDelete',
      bizType: 'user',
      kind: 'manual',
    });
    const id = created.body.id;
    expect((await send('delete', `${segPath()}/${id}`, token).send()).status).toBe(204);
    expect((await api('get', `${segPath()}/${id}`, token)).status).toBe(404);
  });

  it('cannot modify or delete the built-in "all" segment (400 E1017)', async () => {
    const token = await mint([Capability.SegmentUpdate, Capability.SegmentDelete]);
    const upd = await send('patch', `${segPath()}/${allSegmentId}`, token).send({ name: 'x' });
    expect(upd.status).toBe(400);
    expect(upd.body.error.code).toBe('E1017');
    const del = await send('delete', `${segPath()}/${allSegmentId}`, token).send();
    expect(del.status).toBe(400);
    expect(del.body.error.code).toBe('E1017');
  });

  it('adds + removes a member on a manual user segment', async () => {
    const token = await mint([
      Capability.SegmentCreate,
      Capability.SegmentUpdate,
      Capability.UserRead,
    ]);
    const seg = await send('post', segPath(), token).send({
      name: 'Manual users',
      bizType: 'user',
      kind: 'manual',
    });
    const id = seg.body.id;

    expect((await send('put', `${memberPath(id)}/${memberExternalId}`, token).send()).status).toBe(
      204,
    );
    // membership visible via the env users filter
    const inSeg = await api(
      'get',
      `/v2/projects/${projectId}/environments/${environmentId}/users?segmentId=${id}`,
      token,
    );
    expect(inSeg.body.results.map((u: { id: string }) => u.id)).toContain(memberExternalId);

    expect(
      (await send('delete', `${memberPath(id)}/${memberExternalId}`, token).send()).status,
    ).toBe(204);
    const after = await api(
      'get',
      `/v2/projects/${projectId}/environments/${environmentId}/users?segmentId=${id}`,
      token,
    );
    expect(after.body.results.map((u: { id: string }) => u.id)).not.toContain(memberExternalId);
  });

  it('adds a member on a manual company segment; visible via companies?segmentId', async () => {
    const token = await mint([
      Capability.SegmentCreate,
      Capability.SegmentUpdate,
      Capability.CompanyRead,
    ]);
    const companyExternalId = (
      await buildBizCompany(prisma, { environmentId, externalId: 'co-seg-acme' })
    ).externalId;
    const seg = await send('post', segPath(), token).send({
      name: 'Manual companies',
      bizType: 'company',
      kind: 'manual',
    });
    const id = seg.body.id;

    expect((await send('put', `${memberPath(id)}/${companyExternalId}`, token).send()).status).toBe(
      204,
    );
    // membership visible via the env companies filter (the company-segment read path)
    const inSeg = await api(
      'get',
      `/v2/projects/${projectId}/environments/${environmentId}/companies?segmentId=${id}`,
      token,
    );
    expect(inSeg.body.results.map((c: { id: string }) => c.id)).toContain(companyExternalId);

    expect(
      (await send('delete', `${memberPath(id)}/${companyExternalId}`, token).send()).status,
    ).toBe(204);
    const after = await api(
      'get',
      `/v2/projects/${projectId}/environments/${environmentId}/companies?segmentId=${id}`,
      token,
    );
    expect(after.body.results.map((c: { id: string }) => c.id)).not.toContain(companyExternalId);
  });

  it('rejects adding a member to a condition segment (400)', async () => {
    const token = await mint([Capability.SegmentCreate, Capability.SegmentUpdate]);
    const seg = await send('post', segPath(), token).send({
      name: 'Cond',
      bizType: 'user',
      kind: 'condition',
      conditions: [],
    });
    const res = await send('put', `${memberPath(seg.body.id)}/${memberExternalId}`, token).send();
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('member add 404s for an unknown user (E1001)', async () => {
    const token = await mint([Capability.SegmentCreate, Capability.SegmentUpdate]);
    const seg = await send('post', segPath(), token).send({
      name: 'Manual2',
      bizType: 'user',
      kind: 'manual',
    });
    const res = await send('put', `${memberPath(seg.body.id)}/no-such-user`, token).send();
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1001');
  });

  it('POST rejects a token without segment:create (403 E1012)', async () => {
    const token = await mint([Capability.SegmentRead]);
    const res = await send('post', segPath(), token).send({
      name: 'x',
      bizType: 'user',
      kind: 'manual',
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });
});
