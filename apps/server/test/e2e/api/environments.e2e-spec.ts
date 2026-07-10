import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/** Contract test for the v2 environments read endpoints (list + get). */
describe('API v2 /environments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let primaryEnvId: string;
  let otherEnvId: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  async function mint(scopes: Capability[], environmentIds?: string[]): Promise<string> {
    const input: Record<string, unknown> = { name: 'k', scopes, projectIds: [projectId] };
    if (environmentIds) {
      input.environmentIds = environmentIds;
    }
    const res = await graphql(app, { query: CREATE, variables: { input }, token: ownerToken });
    return gqlData(res).createApiToken.token;
  }

  function api(method: 'get', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  const base = () => `/v2/projects/${projectId}/environments`;
  const send = (method: 'post' | 'patch' | 'delete', path: string, token: string) =>
    request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-environments' })).id;
    // Cloud mode gates env creation on the plan; a BUSINESS subscription gives an
    // unlimited environment limit so the create test has runway.
    await buildSubscription(prisma, { projectId });
    primaryEnvId = (
      await buildEnvironment(prisma, { projectId, isPrimary: true, name: 'Production' })
    ).id;
    otherEnvId = (await buildEnvironment(prisma, { projectId, name: 'Staging' })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
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

  it('lists environments with the v2 shape', async () => {
    const token = await mint([Capability.EnvironmentRead]);
    const res = await api('get', base(), token);
    expect(res.status).toBe(200);
    const ids = res.body.results.map((e: { id: string }) => e.id);
    expect(ids).toEqual(expect.arrayContaining([primaryEnvId, otherEnvId]));
    expect(res.body.results).toContainEqual(
      expect.objectContaining({ id: primaryEnvId, object: 'environment', isPrimary: true }),
    );
  });

  it('paginates with limit (next cursor set when more remain)', async () => {
    const token = await mint([Capability.EnvironmentRead]);
    const res = await api('get', `${base()}?limit=1`, token);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.next).toEqual(expect.stringContaining('cursor='));
  });

  it('gets an environment by id, exposing the SDK token', async () => {
    const token = await mint([Capability.EnvironmentRead]);
    const res = await api('get', `${base()}/${primaryEnvId}`, token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: primaryEnvId, object: 'environment', name: 'Production' });
    // The SDK token (usertour.init()) is part of the response.
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it('returns 404 for an unknown environment (E1026)', async () => {
    const token = await mint([Capability.EnvironmentRead]);
    const res = await api('get', `${base()}/nope`, token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1026');
  });

  it('rejects listing without environment:read (403 E1012)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', base(), token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('creates, renames, and deletes an environment (environment:manage)', async () => {
    const token = await mint([Capability.EnvironmentManage, Capability.EnvironmentRead]);
    const created = await send('post', base(), token).send({ name: 'Sandbox' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      object: 'environment',
      name: 'Sandbox',
      isPrimary: false,
    });
    const id = created.body.id;

    const upd = await send('patch', `${base()}/${id}`, token).send({ name: 'Sandbox 2' });
    expect(upd.status).toBe(200);
    expect(upd.body.name).toBe('Sandbox 2');

    expect((await send('delete', `${base()}/${id}`, token).send()).status).toBe(204);
    expect((await api('get', `${base()}/${id}`, token)).status).toBe(404);
  });

  it('cannot delete the primary environment (400 E1017)', async () => {
    const token = await mint([Capability.EnvironmentManage]);
    const res = await send('delete', `${base()}/${primaryEnvId}`, token).send();
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('rejects create without environment:manage (403 E1012)', async () => {
    const token = await mint([Capability.EnvironmentRead]);
    const res = await send('post', base(), token).send({ name: 'Nope' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  // The item routes use `:id` (not `:environmentId`), so the guard's path-param
  // scope check never fires — the handlers assert the token's env allowlist
  // themselves. A token scoped to one environment must not read, rename, or
  // DELETE another, even with the right capability.
  describe('environment allowlist enforcement (handler asserts on :id)', () => {
    it('404s a NON-existent id even for an env-restricted token (E1026, not masked as E1029)', async () => {
      // Existence is checked before the allowlist: a token that manages this
      // project may learn which of its envs exist, so a dead id must 404 (E1026),
      // not report "outside your scope" (E1029) — which would misdirect the client
      // and never let a delete-until-404 loop terminate.
      const token = await mint([Capability.EnvironmentManage], [primaryEnvId]);
      const res = await send('delete', `${base()}/does-not-exist`, token).send();
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1026');
    });

    it('rejects DELETE of an out-of-scope environment (403 E1029)', async () => {
      const token = await mint([Capability.EnvironmentManage], [primaryEnvId]);
      const res = await send('delete', `${base()}/${otherEnvId}`, token).send();
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1029');
    });

    it('rejects PATCH-rename of an out-of-scope environment (403 E1029)', async () => {
      const token = await mint([Capability.EnvironmentManage], [primaryEnvId]);
      const res = await send('patch', `${base()}/${otherEnvId}`, token).send({ name: 'Hijacked' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1029');
    });

    it('rejects GET of an out-of-scope environment (403 E1029)', async () => {
      const token = await mint([Capability.EnvironmentRead], [primaryEnvId]);
      const res = await api('get', `${base()}/${otherEnvId}`, token);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1029');
    });

    it('allows PATCH-rename of an IN-scope environment', async () => {
      const token = await mint(
        [Capability.EnvironmentManage, Capability.EnvironmentRead],
        [otherEnvId],
      );
      const res = await send('patch', `${base()}/${otherEnvId}`, token).send({ name: 'Staging 2' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Staging 2');
    });
  });
});
