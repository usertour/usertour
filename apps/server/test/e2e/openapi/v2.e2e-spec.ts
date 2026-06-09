import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { OpenApiObjectType } from '@/common/openapi/types';

import { gqlData, graphql } from '../auth';
import {
  buildBizUser,
  buildContent,
  buildEnvironment,
  buildMembership,
  buildProject,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Real-DB contract test for the v2 API surface and its credential:
 * - GraphQL self-service token management (create reveal-once / list / revoke)
 * - the ApiTokenGuard chain on project-rooted v2 read routes:
 *   project-in-token-scope, ROLE_CAPABILITIES[role] ∩ scopes, env-belongs-to-
 *   project, and live UserOnProject membership.
 */
describe('OpenAPI v2 + API tokens (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string; // JWT for GraphQL
  let ownerUserId: string;
  let projectA: string;
  let envA: string;
  let project2: string;
  let env2: string;
  const bizUserExternalId = 'v2-biz-1';

  // A published content in projectA/envA, to assert the v2 environments[] shape.
  let publishedContentId: string;
  let publishedVersionId: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){
      token
      apiToken { id name prefix partialKey scopes projectIds isActive }
    }
  }`;
  const LIST = 'query{ apiTokens { id name scopes projectIds isActive } }';
  const REVOKE = 'mutation($id: String!){ revokeApiToken(id: $id) }';

  async function mint(
    scopes: Capability[],
    projectIds: string[],
  ): Promise<{ token: string; apiToken: { id: string } }> {
    const res = await graphql(app, {
      query: CREATE,
      variables: { input: { name: 'k', scopes, projectIds } },
      token: ownerToken,
    });
    return gqlData(res).createApiToken;
  }

  function v2(method: 'get', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectA = (await buildProject(prisma, { name: 'v2-a' })).id;
    envA = (await buildEnvironment(prisma, { projectId: projectA })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId: projectA, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    // A second project the owner also belongs to — for project-scope + env-mismatch cases.
    project2 = (await buildProject(prisma, { name: 'v2-b' })).id;
    await buildMembership(prisma, { userId: ownerUserId, projectId: project2, role: 'OWNER' });
    env2 = (await buildEnvironment(prisma, { projectId: project2 })).id;

    await buildBizUser(prisma, { environmentId: envA, externalId: bizUserExternalId });

    // Publish a content to envA via a ContentOnEnvironment row (the real,
    // per-environment publish state that v2 exposes as environments[]).
    const content = await buildContent(prisma, { projectId: projectA, environmentId: envA });
    publishedContentId = content.id;
    publishedVersionId = (await buildVersion(prisma, { contentId: publishedContentId })).id;
    await prisma.contentOnEnvironment.create({
      data: {
        environmentId: envA,
        contentId: publishedContentId,
        published: true,
        publishedVersionId,
      },
    });
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await teardownProject(prisma, projectA);
      await teardownProject(prisma, project2);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  describe('token management (GraphQL)', () => {
    it('creates a token and returns the plaintext once (utp_ prefix)', async () => {
      const { token, apiToken } = await mint(
        [Capability.BizdataRead, Capability.ContentRead],
        [projectA],
      );
      expect(token.startsWith('utp_')).toBe(true);
      expect((apiToken as any).prefix).toBe('utp_');
      expect((apiToken as any).projectIds).toEqual([projectA]);
      expect((apiToken as any).scopes).toEqual(
        expect.arrayContaining([Capability.BizdataRead, Capability.ContentRead]),
      );
      expect((apiToken as any).isActive).toBe(true);
    });

    it('lists the caller’s tokens without exposing the secret', async () => {
      const res = await graphql(app, { query: LIST, token: ownerToken });
      const list = gqlData(res).apiTokens;
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      expect(list[0]).not.toHaveProperty('token');
    });

    it('rejects a scope that is not a known capability', async () => {
      const res = await graphql(app, {
        query: CREATE,
        variables: { input: { name: 'bad', scopes: ['not:a:cap'], projectIds: [projectA] } },
        token: ownerToken,
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });

    it('rejects a project the user is not a member of', async () => {
      const stranger = await buildProject(prisma, { name: 'v2-stranger' });
      const res = await graphql(app, {
        query: CREATE,
        variables: {
          input: { name: 'x', scopes: [Capability.BizdataRead], projectIds: [stranger.id] },
        },
        token: ownerToken,
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
      await prisma.project.deleteMany({ where: { id: stranger.id } });
    });
  });

  describe('v2 read auth chain', () => {
    let full: string;

    beforeAll(async () => {
      full = (
        await mint(
          [
            Capability.BizdataRead,
            Capability.ContentRead,
            Capability.AttributeRead,
            Capability.EventRead,
          ],
          [projectA],
        )
      ).token;
    });

    it('reads users (200) and includes the seeded user', async () => {
      const res = await v2('get', `/v2/projects/${projectA}/environments/${envA}/users`, full);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.map((u: { id: string }) => u.id)).toContain(bizUserExternalId);
    });

    it('reads project-level content (200)', async () => {
      const res = await v2('get', `/v2/projects/${projectA}/content`, full);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.results)).toBe(true);
    });

    it('exposes per-environment publish state via environments[] (not legacy fields)', async () => {
      const res = await v2('get', `/v2/projects/${projectA}/content/${publishedContentId}`, full);
      expect(res.status).toBe(200);
      expect(res.body.environments).toContainEqual(
        expect.objectContaining({ environmentId: envA, published: true, publishedVersionId }),
      );
      // v2 drops the deprecated single-version legacy fields.
      expect(res.body).not.toHaveProperty('publishedVersionId');
      expect(res.body).not.toHaveProperty('publishedVersion');
    });

    it('expands environments[i].publishedVersion with the publishedVersion expand', async () => {
      const res = await v2(
        'get',
        `/v2/projects/${projectA}/content/${publishedContentId}?expand=publishedVersion`,
        full,
      );
      expect(res.status).toBe(200);
      const env = res.body.environments.find(
        (e: { environmentId: string }) => e.environmentId === envA,
      );
      expect(env).toBeDefined();
      expect(env.publishedVersion).toMatchObject({
        id: publishedVersionId,
        object: OpenApiObjectType.CONTENT_VERSION,
      });
    });

    it('reads attribute-definitions (200)', async () => {
      const res = await v2('get', `/v2/projects/${projectA}/attribute-definitions`, full);
      expect(res.status).toBe(200);
    });

    it('rejects a missing Authorization header (401 E1010)', async () => {
      const res = await v2('get', `/v2/projects/${projectA}/content`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('E1010');
    });

    it('rejects a wrong auth scheme (401 E1010)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v2/projects/${projectA}/content`)
        .set('Authorization', 'Basic abc123');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('E1010');
    });

    it('rejects an unknown token (403 E1000)', async () => {
      const res = await v2('get', `/v2/projects/${projectA}/content`, 'utp_not-a-real-secret');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1000');
    });

    it('rejects a project not in the token scope (403 E1011)', async () => {
      const res = await v2('get', `/v2/projects/${project2}/environments/${env2}/users`, full);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1011');
    });

    it('rejects insufficient scope (403 E1012)', async () => {
      const bizOnly = (await mint([Capability.BizdataRead], [projectA])).token;
      const res = await v2('get', `/v2/projects/${projectA}/content`, bizOnly);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1012');
    });

    it('rejects an environment not in the path project (403 E1019)', async () => {
      const res = await v2('get', `/v2/projects/${projectA}/environments/${env2}/users`, full);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1019');
    });

    it('rejects a revoked token (403 E1000)', async () => {
      const created = await mint([Capability.ContentRead], [projectA]);
      await graphql(app, {
        query: REVOKE,
        variables: { id: created.apiToken.id },
        token: ownerToken,
      });
      const res = await v2('get', `/v2/projects/${projectA}/content`, created.token);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1000');
    });

    it('rejects after the owner loses project membership (403 E1011)', async () => {
      const scoped = (await mint([Capability.ContentRead], [project2])).token;
      await prisma.userOnProject.deleteMany({
        where: { userId: ownerUserId, projectId: project2 },
      });
      const res = await v2('get', `/v2/projects/${project2}/content`, scoped);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1011');
    });
  });
});
