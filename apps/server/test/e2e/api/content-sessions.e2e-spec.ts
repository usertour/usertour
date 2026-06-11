import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildBizUser,
  buildContent,
  buildEnvironment,
  buildProject,
  buildSession,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Shape contract for the v2 content-sessions endpoints. Its embedded content is
 * the A-shape lightweight reference (no publish state), so this is a shape test
 * rather than a v1 parity test.
 */
describe('API v2 /content-sessions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let environmentId: string;
  let contentId: string;
  let sessionId: string;
  const userExternalId = 'bu-session-jane';

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

  function base(suffix = ''): string {
    return `/v2/projects/${projectId}/environments/${environmentId}/content-sessions${suffix}`;
  }
  function api(method: 'get', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-sessions' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    contentId = content.id;
    const versionId = (await buildVersion(prisma, { contentId, sequence: 0 })).id;
    const bizUser = await buildBizUser(prisma, {
      environmentId,
      externalId: userExternalId,
      data: { name: 'Jane' },
    });
    const session = await buildSession(prisma, {
      bizUserId: bizUser.id,
      contentId,
      versionId,
      environmentId,
      projectId,
    });
    sessionId = session.id;
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

  it('gets a session by id (embeds null without expand)', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base(`/${sessionId}`), token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: sessionId,
      object: 'contentSession',
      contentId,
      userId: userExternalId,
    });
    expect(res.body.content).toBeNull();
    expect(res.body.user).toBeNull();
    expect(res.body.answers).toBeNull();
  });

  it('embeds the A-shape content on expand=content (no publish state)', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base(`/${sessionId}?expand=content`), token);
    expect(res.status).toBe(200);
    expect(res.body.content).toMatchObject({ id: contentId, object: 'content', type: 'flow' });
    expect(res.body.content).toHaveProperty('editedVersionId');
    expect(res.body.content).not.toHaveProperty('publishedVersionId');
    expect(res.body.content).not.toHaveProperty('environments');
  });

  it('embeds the user on expand=user', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base(`/${sessionId}?expand=user`), token);
    expect(res.body.user).toMatchObject({ id: userExternalId, object: 'user' });
  });

  it('lists sessions for a content', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base(`?contentId=${contentId}`), token);
    expect(res.status).toBe(200);
    expect(res.body.results.map((s: { id: string }) => s.id)).toContain(sessionId);
  });

  it('returns 404 for an unknown session (E1005)', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base('/nope'), token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1005');
  });

  it('returns 404 listing sessions for an unknown content (E1004)', async () => {
    const token = await mint([Capability.SessionRead]);
    const res = await api('get', base('?contentId=nope'), token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('rejects insufficient scope (403 E1012)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', base(`?contentId=${contentId}`), token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });
});
