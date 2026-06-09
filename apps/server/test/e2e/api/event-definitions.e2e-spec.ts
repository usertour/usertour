import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Capability } from '@usertour/types';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { ApiModule } from '@/api/api.module';
import { OpenAPIModule } from '@/openapi/openapi.module';

import { gqlData, graphql } from '../auth';
import { buildEnvironment, buildEvent, buildProject } from '../factories';
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
    await app?.close();
  });

  it('lists event definitions (200) with the zod response shape', async () => {
    const token = await mint([Capability.EventRead]);
    const res = await api('get', `/v2/projects/${projectId}/event-definitions`, token);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    const seeded = res.body.results.find((e: { codeName: string }) => e.codeName === codeName);
    expect(seeded).toMatchObject({ object: 'eventDefinition', displayName: 'Flow Started' });
  });

  it('coerces + validates the query via zod (limit=0 → 400)', async () => {
    const token = await mint([Capability.EventRead]);
    const res = await api('get', `/v2/projects/${projectId}/event-definitions?limit=0`, token);
    expect(res.status).toBe(400);
  });

  it('rejects a missing Authorization header (401 E1010)', async () => {
    const res = await api('get', `/v2/projects/${projectId}/event-definitions`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('E1010');
  });

  it('rejects insufficient scope (403 E1012)', async () => {
    const token = await mint([Capability.BizdataRead]);
    const res = await api('get', `/v2/projects/${projectId}/event-definitions`, token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
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
});
