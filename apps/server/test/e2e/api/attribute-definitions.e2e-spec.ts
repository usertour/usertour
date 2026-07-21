import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { buildAttribute, buildBizUser } from '../factories';
import { buildAuthorizedUser } from '../gql/_support';
import { createTestApp } from '../create-test-app';
import { OpenApiFixture, openapi, seedApiFixture, teardownApiFixture } from '../openapi';

/**
 * Parity contract for the rebuilt v2 attribute-definitions: the new contract-first
 * module must return BYTE-IDENTICAL JSON to the frozen v1 endpoint. We seed one
 * project, hit /v1 (env-key auth) and /v2 (token auth) against the same data, and
 * deep-equal the items — any drift fails here.
 */
describe('API v2 /attribute-definitions parity with v1 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let fx: OpenApiFixture; // project + environment + v1 env-key
  let ownerToken: string; // JWT for minting the v2 token
  let ownerUserId: string;
  let v2Token: string;
  const codeName = 'attr_parity_signup';

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  function api(method: 'get', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    // v1 surface: project + environment + AccessToken (env-key).
    fx = await seedApiFixture(prisma, { projectName: 'api-v2-attr-parity' });

    // v2 surface: an owner of the SAME project + a token with AttributeRead.
    const owner = await buildAuthorizedUser(prisma, app, {
      projectId: fx.projectId,
      role: 'OWNER',
    });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
    const minted = await graphql(app, {
      query: CREATE,
      variables: {
        input: { name: 'k', scopes: [Capability.AttributeRead], projectIds: [fx.projectId] },
      },
      token: ownerToken,
    });
    v2Token = gqlData(minted).createApiToken.token;

    await buildAttribute(prisma, {
      projectId: fx.projectId,
      codeName,
      displayName: 'Signed Up',
      description: 'When the user signed up',
      bizType: 1,
      dataType: 1,
    });
    await buildAttribute(prisma, { projectId: fx.projectId, codeName: 'attr_parity_plan' });
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await prisma.userOnProject.deleteMany({ where: { projectId: fx.projectId } });
      await teardownApiFixture(prisma, fx);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  it('returns byte-identical attribute JSON on v1 and v2', async () => {
    const v1 = await openapi(app, {
      method: 'get',
      path: '/v1/attribute-definitions',
      token: fx.apiKey,
    });
    const v2 = await api('get', `/v2/projects/${fx.projectId}/attribute-definitions`, v2Token);

    expect(v1.status).toBe(200);
    expect(v2.status).toBe(200);

    const v1item = v1.body.results.find((a: { codeName: string }) => a.codeName === codeName);
    const v2item = v2.body.results.find((a: { codeName: string }) => a.codeName === codeName);
    // v2 additively exposes `predefined` (v1 never did); parity holds on the
    // common fields, so compare without the v2-only addition.
    const { predefined: _v2Only, ...v2common } = v2item;
    expect(v1item).toBeDefined();
    expect(v2common).toEqual(v1item);
  });

  it('filters `name` by codeName, not just displayName (the agent search path)', async () => {
    const codes = async (q: string) => {
      const res = await api(
        'get',
        `/v2/projects/${fx.projectId}/attribute-definitions?name=${q}`,
        v2Token,
      );
      expect(res.status).toBe(200);
      return res.body.results.map((a: { codeName: string }) => a.codeName);
    };
    // The machine codeName an agent reads from conditions/diagnose — a displayName-only
    // filter would silently return nothing and read as "attribute not defined".
    expect(await codes(codeName)).toContain(codeName);
    // The human displayName still matches ("Signed Up" ⊃ "signed", case-insensitive).
    expect(await codes('signed')).toContain(codeName);
    // A non-matching term excludes it (guards against an always-true OR).
    expect(await codes('attr_parity_plan')).not.toContain(codeName);
  });

  it('rejects a missing Authorization header (401 E1010)', async () => {
    const res = await api('get', `/v2/projects/${fx.projectId}/attribute-definitions`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('E1010');
  });

  it('rejects insufficient scope (403 E1012)', async () => {
    const minted = await graphql(app, {
      query: CREATE,
      variables: {
        input: {
          name: 'k2',
          scopes: [Capability.UserRead],
          projectIds: [fx.projectId],
          environmentIds: [fx.environmentId],
        },
      },
      token: ownerToken,
    });
    const token = gqlData(minted).createApiToken.token;
    const res = await api('get', `/v2/projects/${fx.projectId}/attribute-definitions`, token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  // Error-code alignment with v1's published catalog.
  it('maps a bad limit to E1017 (zod validation)', async () => {
    const res = await api(
      'get',
      `/v2/projects/${fx.projectId}/attribute-definitions?limit=0`,
      v2Token,
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('maps a bad orderBy enum to E1017 (zod validation)', async () => {
    const res = await api(
      'get',
      `/v2/projects/${fx.projectId}/attribute-definitions?orderBy=nope`,
      v2Token,
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('maps an invalid scope to E1015 (service-level, not E1017)', async () => {
    const res = await api(
      'get',
      `/v2/projects/${fx.projectId}/attribute-definitions?scope=nope`,
      v2Token,
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1015');
  });

  it('filters event attributes with scope=eventDefinition (and excludes them from scope=user)', async () => {
    // Event attributes (bizType 4) are readable through the same list — the
    // scope filter accepts `eventDefinition` even though CREATE deliberately
    // doesn't (event attributes are managed via the event-definitions surface).
    await buildAttribute(prisma, {
      projectId: fx.projectId,
      codeName: 'attr_event_scoped',
      bizType: 4,
      dataType: 2,
    });
    const codes = async (scope: string) => {
      const res = await api(
        'get',
        `/v2/projects/${fx.projectId}/attribute-definitions?scope=${scope}&limit=100`,
        v2Token,
      );
      expect(res.status).toBe(200);
      return res.body.results.map((a: { codeName: string }) => a.codeName);
    };
    const eventScoped = await codes('eventDefinition');
    expect(eventScoped).toContain('attr_event_scoped');
    expect(eventScoped).not.toContain(codeName); // the user-scoped fixture stays out
    expect(await codes('user')).not.toContain('attr_event_scoped');
  });

  async function mint(scopes: Capability[], environmentIds?: string[]): Promise<string> {
    const minted = await graphql(app, {
      query: CREATE,
      variables: {
        // Env-targeted scopes must NAME environments (server rule) — default to the suite env.
        input: {
          name: 'kw',
          scopes,
          projectIds: [fx.projectId],
          environmentIds: environmentIds ?? [fx.environmentId],
        },
      },
      token: ownerToken,
    });
    return gqlData(minted).createApiToken.token;
  }
  const basePath = () => `/v2/projects/${fx.projectId}/attribute-definitions`;
  const send = (method: 'post' | 'patch' | 'delete', path: string, token: string) =>
    request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);

  it('creates → updates → deletes an attribute definition', async () => {
    const token = await mint([
      Capability.AttributeCreate,
      Capability.AttributeUpdate,
      Capability.AttributeDelete,
      Capability.AttributeRead,
    ]);

    const created = await send('post', basePath(), token).send({
      scope: 'user',
      dataType: 'string',
      codeName: 'attr_write_x',
      displayName: 'X',
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      object: 'attributeDefinition',
      codeName: 'attr_write_x',
      displayName: 'X',
      dataType: 'string',
      scope: 'user',
    });
    const id = created.body.id;

    const updated = await send('patch', `${basePath()}/${id}`, token).send({
      displayName: 'X2',
      description: 'desc',
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ displayName: 'X2', description: 'desc' });

    expect((await send('delete', `${basePath()}/${id}`, token).send()).status).toBe(204);
    const list = await api('get', basePath(), token);
    expect(list.body.results.map((a: { id: string }) => a.id)).not.toContain(id);
  });

  it('retypes an attribute when no stored value conflicts, and rejects when one does', async () => {
    const token = await mint([
      Capability.AttributeCreate,
      Capability.AttributeUpdate,
      Capability.AttributeRead,
    ]);
    // (a) no stored values yet → the type can be corrected.
    const ok = await send('post', basePath(), token).send({
      scope: 'user',
      dataType: 'number',
      codeName: 'attr_retype_ok',
      displayName: 'R',
    });
    const okPatch = await send('patch', `${basePath()}/${ok.body.id}`, token).send({
      dataType: 'string',
    });
    expect(okPatch.status).toBe(200);
    expect(okPatch.body.dataType).toBe('string');

    // (b) a stored value that won't fit the new type → rejected (E1017), unchanged.
    const bad = await send('post', basePath(), token).send({
      scope: 'user',
      dataType: 'number',
      codeName: 'attr_retype_bad',
      displayName: 'R2',
    });
    await buildBizUser(prisma, {
      environmentId: fx.environmentId,
      data: { attr_retype_bad: 42 },
    });
    const badPatch = await send('patch', `${basePath()}/${bad.body.id}`, token).send({
      dataType: 'string',
    });
    expect(badPatch.status).toBe(400);
    expect(badPatch.body.error.code).toBe('E1017');
  });

  it('gets an attribute definition by id (404 unknown → E1022)', async () => {
    const token = await mint([Capability.AttributeCreate, Capability.AttributeRead]);
    const created = await send('post', basePath(), token).send({
      scope: 'user',
      dataType: 'string',
      codeName: 'attr_get_x',
      displayName: 'G',
    });
    const got = await api('get', `${basePath()}/${created.body.id}`, token);
    expect(got.status).toBe(200);
    expect(got.body).toMatchObject({ id: created.body.id, codeName: 'attr_get_x' });

    const no = await api('get', `${basePath()}/nope`, token);
    expect(no.status).toBe(404);
    expect(no.body.error.code).toBe('E1022');
  });

  it('rejects a duplicate codeName (409 E1023)', async () => {
    const token = await mint([Capability.AttributeCreate]);
    const res = await send('post', basePath(), token).send({
      scope: 'user', // bizType 1 — same as the seeded attr_parity_signup
      dataType: 'string',
      codeName,
      displayName: 'dup',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('E1023');
  });

  it('POST rejects a token without attribute:create (403 E1012)', async () => {
    const res = await send('post', basePath(), v2Token).send({
      scope: 'user',
      dataType: 'string',
      codeName: 'attr_noscope',
      displayName: 'no',
    }); // v2Token: attribute:read only
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('PATCH 404 for an unknown attribute (E1022)', async () => {
    const token = await mint([Capability.AttributeUpdate]);
    const res = await send('patch', `${basePath()}/nope`, token).send({ displayName: 'x' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1022');
  });

  it('cannot modify a predefined attribute (400 E1017)', async () => {
    const token = await mint([Capability.AttributeUpdate, Capability.AttributeDelete]);
    const predef = await prisma.attribute.create({
      data: {
        projectId: fx.projectId,
        bizType: 1,
        dataType: 2,
        codeName: 'attr_predef',
        displayName: 'Predef',
        description: '',
        predefined: true,
      },
    });
    const patched = await send('patch', `${basePath()}/${predef.id}`, token).send({
      displayName: 'nope',
    });
    expect(patched.status).toBe(400);
    expect(patched.body.error.code).toBe('E1017');

    const deleted = await send('delete', `${basePath()}/${predef.id}`, token).send();
    expect(deleted.status).toBe(400);
    expect(deleted.body.error.code).toBe('E1017');
  });
});
