import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildAttribute,
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

    // The narrowed schema (attribute + group ONLY) must still accept the full
    // legitimate shape: attribute leaves nested in groups. The attribute must
    // EXIST — semantic validation rejects dangling references.
    await buildAttribute(prisma, { projectId, bizType: 1, dataType: 1, codeName: 'plan' });
    const attrSeg = await send('post', segPath(), token).send({
      name: 'Pro or trial seg',
      bizType: 'user',
      kind: 'condition',
      conditions: [
        {
          type: 'group',
          match: 'any',
          conditions: [
            { type: 'attribute', scope: 'user', attribute: 'plan', op: 'is', value: 'pro' },
            { type: 'attribute', scope: 'user', attribute: 'plan', op: 'is', value: 'trial' },
          ],
        },
      ],
    });
    expect(attrSeg.status).toBe(201);
    const read = await api('get', `${segPath()}/${attrSeg.body.id}`, token);
    expect(read.body.conditions?.[0]).toMatchObject({ type: 'group', match: 'any' });
  });

  it('reads a legacy company-attr stored condition as a normal attribute condition', async () => {
    // `company-attr` predates the unified user-attr storage type. The runtime
    // matches it fine (filters resolve attrId directly), so the read side must
    // NOT misreport live data as `unsupported`.
    const token = await mint([Capability.SegmentRead]);
    const attr = await buildAttribute(prisma, {
      projectId,
      bizType: 2, // company attribute
      dataType: 2,
      codeName: 'legacy_subscription',
    });
    const legacy = await buildSegment(prisma, {
      projectId,
      environmentId,
      name: 'legacy company-attr seg',
      bizType: 2,
      dataType: 2, // condition
      data: [
        {
          type: 'company-attr',
          operators: 'and',
          data: { attrId: attr.id, logic: 'is', value: 'pro' },
        },
      ],
    });
    const res = await api('get', `${segPath()}/${legacy.id}`, token);
    expect(res.status).toBe(200);
    expect(res.body.conditions?.[0]).toMatchObject({
      type: 'attribute',
      scope: 'company',
      attribute: 'legacy_subscription',
      op: 'is',
      value: 'pro',
    });
  });

  it('reads a truly unknown stored condition as `unsupported`, and refuses its echo on write', async () => {
    const token = await mint([
      Capability.SegmentRead,
      Capability.SegmentCreate,
      Capability.SegmentUpdate,
    ]);
    const weird = await buildSegment(prisma, {
      projectId,
      environmentId,
      name: 'weird legacy seg',
      bizType: 1,
      dataType: 2,
      data: [{ type: 'weird-legacy-type', operators: 'and', data: {} }],
    });
    // Read: the placeholder is part of the schema now (a typed client must not
    // choke on the whole list because one segment carries it).
    const res = await api('get', `${segPath()}/${weird.id}`, token);
    expect(res.status).toBe(200);
    expect(res.body.conditions?.[0]).toEqual({ type: 'unsupported', note: 'weird-legacy-type' });

    // Write-back of the echo is refused with directions, never silently dropped.
    const upd = await send('patch', `${segPath()}/${weird.id}`, token).send({
      conditions: [{ type: 'unsupported', note: 'weird-legacy-type' }],
    });
    expect(upd.status).toBe(400);
    expect(upd.body.error.code).toBe('E1017');
    expect(upd.body.error.message).toContain('cannot be written back');
  });

  it('a condition whose attribute was DELETED reads as `unsupported`, not a leaked cuid', async () => {
    // Full loop from console sweep endpoint 15: create attribute -> reference
    // it in a segment -> delete the attribute (204, nothing blocks it). The
    // condition used to decompile with the raw internal id in `attribute` — a
    // field whose contract is a codeName — looking perfectly healthy on read
    // and only failing on write-back. It must surface as `unsupported` with a
    // note that says what happened.
    const token = await mint([
      Capability.SegmentRead,
      Capability.SegmentCreate,
      Capability.AttributeCreate,
      Capability.AttributeDelete,
    ]);
    const created = await request(app.getHttpServer())
      .post(`/v2/projects/${projectId}/attribute-definitions`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        codeName: 'seg_doomed_attr',
        displayName: 'Doomed',
        scope: 'user',
        dataType: 'string',
      });
    expect(created.status).toBe(201);
    const attrId = created.body.id;

    const seg = await send('post', segPath(), token).send({
      name: 'refs doomed attr',
      bizType: 'user',
      kind: 'condition',
      conditions: [
        { type: 'attribute', scope: 'user', attribute: 'seg_doomed_attr', op: 'is', value: 'x' },
      ],
    });
    expect(seg.status).toBe(201);

    const del = await request(app.getHttpServer())
      .delete(`/v2/projects/${projectId}/attribute-definitions/${attrId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const read = await api('get', `${segPath()}/${seg.body.id}`, token);
    expect(read.status).toBe(200);
    const cond = read.body.conditions?.[0];
    expect(cond.type).toBe('unsupported');
    expect(cond.note).toContain('deleted attribute');
    expect(cond.note).toContain(attrId);
    // The raw cuid must NOT appear as a codeName-contract value anywhere.
    expect(cond.attribute).toBeUndefined();
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
