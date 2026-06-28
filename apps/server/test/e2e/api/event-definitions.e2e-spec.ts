import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Capability } from '@usertour/types';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { ApiModule } from '@/api/api.module';
import { normalizeOpenApiParameters } from '@/common/openapi/normalize-parameters';
import { OpenAPIModule } from '@/openapi/openapi.module';

import { gqlData, graphql } from '../auth';
import { buildAttribute, buildEnvironment, buildEvent, buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Spike contract test for the new contract-first v2 module: proves the zod-driven
 * stack (createZodDto request validation + ApiTokenGuard/@RequireCapability auth +
 * domain-backed handler) works end-to-end for one resource.
 */
describe('API v2 /event-definitions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string; // JWT for GraphQL token minting
  let ownerUserId: string;
  let projectId: string;
  const codeName = 'evt_spike_flow_started';

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  async function mint(scopes: Capability[]): Promise<string> {
    const res = await graphql(app, {
      query: CREATE,
      variables: { input: { name: 'k', scopes, projectIds: [projectId] } },
      token: ownerToken,
    });
    return gqlData(res).createApiToken.token;
  }

  function api(method: 'get', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-events' })).id;
    await buildEnvironment(prisma, { projectId });
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    await buildEvent(prisma, { projectId, codeName, displayName: 'Flow Started' });
    await buildEvent(prisma, { projectId, codeName: 'evt_spike_other' });
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    // The DB teardown above is fast (~60ms); it's app.close() that can hang on
    // lingering redis/bullmq/websocket handles (see create-test-app). The process
    // is reaped by jest --forceExit, so cap the wait instead of letting a stuck
    // shutdown fail the hook.
    await Promise.race([app?.close(), new Promise((resolve) => setTimeout(resolve, 5000))]);
  });

  it('lists event definitions (200) with the zod response shape', async () => {
    const token = await mint([Capability.EventRead]);
    const res = await api('get', `/v2/projects/${projectId}/event-definitions`, token);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    const seeded = res.body.results.find((e: { codeName: string }) => e.codeName === codeName);
    expect(seeded).toMatchObject({ object: 'eventDefinition', displayName: 'Flow Started' });
  });

  it('filters `name` by codeName, not just displayName (the agent search path)', async () => {
    const token = await mint([Capability.EventRead]);
    const codes = async (q: string) => {
      const res = await api('get', `/v2/projects/${projectId}/event-definitions?name=${q}`, token);
      expect(res.status).toBe(200);
      return res.body.results.map((e: { codeName: string }) => e.codeName);
    };
    // Agents reference events by the machine codeName; a displayName-only filter would miss it.
    expect(await codes(codeName)).toContain(codeName);
    // The human displayName still matches ("Flow Started" ⊃ "flow", case-insensitive).
    expect(await codes('flow')).toContain(codeName);
    // A non-matching term excludes it.
    expect(await codes('evt_spike_other')).not.toContain(codeName);
  });

  it('maps a zod validation failure to the documented E1017 (limit=0)', async () => {
    const token = await mint([Capability.EventRead]);
    const res = await api('get', `/v2/projects/${projectId}/event-definitions?limit=0`, token);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('rejects a missing Authorization header (401 E1010)', async () => {
    const res = await api('get', `/v2/projects/${projectId}/event-definitions`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('E1010');
  });

  it('rejects insufficient scope (403 E1012)', async () => {
    const token = await mint([Capability.UserRead]);
    const res = await api('get', `/v2/projects/${projectId}/event-definitions`, token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  const basePath = () => `/v2/projects/${projectId}/event-definitions`;
  const send = (method: 'post' | 'patch' | 'delete', path: string, token: string) =>
    request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);

  it('creates → updates → deletes an event definition', async () => {
    const token = await mint([
      Capability.EventCreate,
      Capability.EventUpdate,
      Capability.EventDelete,
      Capability.EventRead,
    ]);

    const created = await send('post', basePath(), token).send({
      codeName: 'evt_write_x',
      displayName: 'X',
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      object: 'eventDefinition',
      codeName: 'evt_write_x',
      displayName: 'X',
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
    expect(list.body.results.map((e: { id: string }) => e.id)).not.toContain(id);
  });

  it('attaches / reads / replaces event attributes by codeName', async () => {
    const token = await mint([
      Capability.EventCreate,
      Capability.EventUpdate,
      Capability.EventRead,
    ]);
    // Two EVENT-scoped attributes (bizType 4) to attach.
    await buildAttribute(prisma, { projectId, bizType: 4, codeName: 'evt_amount' });
    await buildAttribute(prisma, { projectId, bizType: 4, codeName: 'evt_currency' });

    const created = await send('post', basePath(), token).send({
      codeName: 'evt_purchase',
      displayName: 'Purchase',
      attributes: ['evt_amount'],
    });
    expect(created.status).toBe(201);
    expect(created.body.attributes).toEqual(['evt_amount']);

    // Replace the attached set.
    const updated = await send('patch', `${basePath()}/${created.body.id}`, token).send({
      attributes: ['evt_amount', 'evt_currency'],
    });
    expect(updated.status).toBe(200);
    expect([...updated.body.attributes].sort()).toEqual(['evt_amount', 'evt_currency']);

    // Read back carries the links.
    const got = await api('get', `${basePath()}/${created.body.id}`, token);
    expect([...got.body.attributes].sort()).toEqual(['evt_amount', 'evt_currency']);

    // Unknown attribute codeName → E1017.
    const bad = await send('post', basePath(), token).send({
      codeName: 'evt_bad_attr',
      displayName: 'B',
      attributes: ['nope_missing'],
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('E1017');
  });

  it('rejects an invalid codeName charset (400 E1017)', async () => {
    const token = await mint([Capability.EventCreate]);
    const res = await send('post', basePath(), token).send({
      codeName: 'bad name', // space is not allowed by the codeName charset rule
      displayName: 'X',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('gets an event definition by id (404 unknown → E1024)', async () => {
    const token = await mint([Capability.EventCreate, Capability.EventRead]);
    const created = await send('post', basePath(), token).send({
      codeName: 'evt_get_x',
      displayName: 'G',
    });
    const got = await api('get', `${basePath()}/${created.body.id}`, token);
    expect(got.status).toBe(200);
    expect(got.body).toMatchObject({ id: created.body.id, codeName: 'evt_get_x' });

    const no = await api('get', `${basePath()}/nope`, token);
    expect(no.status).toBe(404);
    expect(no.body.error.code).toBe('E1024');
  });

  it('rejects a duplicate codeName (409 E1023)', async () => {
    const token = await mint([Capability.EventCreate]);
    const res = await send('post', basePath(), token).send({
      codeName: 'evt_spike_other', // seeded
      displayName: 'dup',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('E1023');
  });

  it('PATCH 404 for an unknown event (E1024)', async () => {
    const token = await mint([Capability.EventUpdate]);
    const res = await send('patch', `${basePath()}/nope`, token).send({ displayName: 'x' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1024');
  });

  it('cannot modify a predefined event (400 E1017)', async () => {
    const token = await mint([Capability.EventUpdate]);
    const predef = await prisma.event.create({
      data: {
        projectId,
        codeName: 'evt_predef',
        displayName: 'Predef',
        description: '',
        predefined: true,
      },
    });
    const res = await send('patch', `${basePath()}/${predef.id}`, token).send({
      displayName: 'no',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('renders into one OpenAPI doc alongside v1 (zod schema via cleanupOpenApiDoc)', () => {
    const config = new DocumentBuilder().setTitle('t').addBearerAuth().build();
    const doc = cleanupOpenApiDoc(
      SwaggerModule.createDocument(app, config, { include: [OpenAPIModule, ApiModule] }),
    );
    // v2 (zod) path present
    const v2 = doc.paths['/v2/projects/{projectId}/event-definitions'];
    expect(v2?.get).toBeDefined();
    // v1 (legacy @ApiProperty) path still present in the SAME document
    expect(doc.paths['/v1/content']).toBeDefined();
    // the zod-derived response schema was rendered into components
    const schemas = doc.components?.schemas ?? {};
    expect(Object.keys(schemas)).toContain('ListEventDefinitionsResponseDto');
  });

  it('emits valid OpenAPI parameters (union query params normalized into schema)', () => {
    const config = new DocumentBuilder().setTitle('t').addBearerAuth().build();
    const raw = cleanupOpenApiDoc(
      SwaggerModule.createDocument(app, config, { include: [OpenAPIModule, ApiModule] }),
    );

    // Before normalization, nestjs-zod leaves union (singleOrArray) query params
    // with `anyOf` at the parameter top level — invalid OpenAPI.
    const ALLOWED = new Set([
      'name',
      'in',
      'description',
      'required',
      'deprecated',
      'allowEmptyValue',
      'style',
      'explode',
      'allowReserved',
      'schema',
      'example',
      'examples',
      'content',
      '$ref',
    ]);
    const strayBefore: string[] = [];
    for (const item of Object.values(raw.paths)) {
      for (const op of Object.values(item ?? {})) {
        for (const p of (op as { parameters?: Record<string, unknown>[] })?.parameters ?? []) {
          if ('$ref' in p) continue;
          if (Object.keys(p).some((k) => !ALLOWED.has(k))) strayBefore.push(String(p.name));
        }
      }
    }
    expect(strayBefore.length).toBeGreaterThan(0); // the quirk exists (guards the test's premise)

    // After the same normalization main.ts applies, every parameter is valid.
    const doc = normalizeOpenApiParameters(raw);
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const op of Object.values(item ?? {})) {
        for (const p of (op as { parameters?: Record<string, unknown>[] })?.parameters ?? []) {
          if ('$ref' in p) continue;
          const stray = Object.keys(p).filter((k) => !ALLOWED.has(k));
          expect({ path, name: p.name, stray }).toEqual({ path, name: p.name, stray: [] });
          expect(p.schema ?? p.content).toBeDefined();
        }
      }
    }
  });

  it('builds a v2-only OpenAPI document (the /api-v2-json the docs render from)', () => {
    // Mirrors main.ts: a document scanning ONLY ApiModule → v2 paths, no v1.
    const v2Config = new DocumentBuilder().setTitle('Usertour API v2').addBearerAuth().build();
    const v2 = normalizeOpenApiParameters(
      cleanupOpenApiDoc(SwaggerModule.createDocument(app, v2Config, { include: [ApiModule] })),
    );
    const paths = Object.keys(v2.paths);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((p) => p.startsWith('/v2/'))).toBe(true); // v2 only
    expect(paths.some((p) => p.startsWith('/v1/'))).toBe(false); // no legacy v1

    // v2 (the default API) carries clean, unversioned group tags; v1 carries "(v1)".
    const tags = new Set<string>();
    for (const item of Object.values(v2.paths)) {
      for (const op of Object.values(item ?? {})) {
        for (const t of (op as { tags?: string[] })?.tags ?? []) tags.add(t);
      }
    }
    expect([...tags].filter((t) => /\(v\d\)/.test(t))).toEqual([]);
    expect(tags.has('Content')).toBe(true);
  });
});
