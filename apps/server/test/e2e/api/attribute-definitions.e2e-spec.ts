import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { buildAttribute } from '../factories';
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
  const codeName = 'attr_parity_signed_up';

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
    expect(v1item).toBeDefined();
    expect(v2item).toEqual(v1item);
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
        input: { name: 'k2', scopes: [Capability.UserRead], projectIds: [fx.projectId] },
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
});
