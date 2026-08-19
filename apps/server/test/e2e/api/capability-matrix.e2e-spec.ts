import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { ApiModule } from '@/api/api.module';

import { gqlData, graphql } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildEnvironment, buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';

/**
 * Authorization contract for EVERY v2 REST route: the table below is the
 * REST twin of ../endpoints.ts (the GraphQL role matrix). Each row carries the
 * route's required capability as a literal — deliberately independent of the
 * server's decorator map, so a wrong capability on a controller fails here
 * regardless of what the implementation says.
 *
 * Per row, the spec asserts the two deny directions only:
 *   - no Authorization header → 401 E1010
 *   - a token holding every capability EXCEPT the required one → 403 E1012
 *     (the strongest form: proves no other scope smuggles access in)
 * Both fire in ApiTokenGuard BEFORE the handler, so mutations are side-effect
 * free and path ids other than projectId/environmentId are never resolved —
 * fake ids are fine. The allow direction is covered by each resource's own
 * functional spec.
 *
 * A final coverage guard diffs the table against the v2 OpenAPI document, so
 * adding a route without adding its row (or vice versa) fails the suite.
 */

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';
type Row = { method: Method; template: string; cap: Capability };

const P = '/v2/projects/{projectId}';
const E = `${P}/environments/{environmentId}`;

const ROUTES: Row[] = [
  // content
  { method: 'get', template: `${P}/content`, cap: Capability.ContentRead },
  { method: 'get', template: `${P}/content/{id}`, cap: Capability.ContentRead },
  { method: 'post', template: `${P}/content`, cap: Capability.ContentCreate },
  { method: 'patch', template: `${P}/content/{id}`, cap: Capability.ContentUpdate },
  { method: 'delete', template: `${P}/content/{id}`, cap: Capability.ContentDelete },
  { method: 'post', template: `${P}/content/{id}/restore`, cap: Capability.ContentUpdate },
  { method: 'post', template: `${P}/content/{id}/duplicate`, cap: Capability.ContentCreate },
  { method: 'post', template: `${P}/content/{id}/publish`, cap: Capability.ContentPublish },
  { method: 'post', template: `${P}/content/{id}/unpublish`, cap: Capability.ContentPublish },
  // content versions
  { method: 'get', template: `${P}/content/{contentId}/versions`, cap: Capability.ContentRead },
  {
    method: 'get',
    template: `${P}/content/{contentId}/versions/{id}`,
    cap: Capability.ContentRead,
  },
  {
    method: 'get',
    template: `${P}/content/{contentId}/versions/{id}/validate`,
    cap: Capability.ContentRead,
  },
  { method: 'post', template: `${P}/content/{contentId}/versions`, cap: Capability.ContentUpdate },
  {
    method: 'post',
    template: `${P}/content/{contentId}/versions/{id}/restore`,
    cap: Capability.ContentUpdate,
  },
  {
    method: 'patch',
    template: `${P}/content/{contentId}/versions/{id}`,
    cap: Capability.ContentUpdate,
  },
  // analytics
  { method: 'get', template: `${P}/content/{id}/analytics`, cap: Capability.AnalyticsRead },
  {
    method: 'get',
    template: `${P}/content/{id}/analytics/questions`,
    cap: Capability.AnalyticsRead,
  },
  // themes
  { method: 'get', template: `${P}/themes`, cap: Capability.ThemeRead },
  { method: 'get', template: `${P}/themes/{id}`, cap: Capability.ThemeRead },
  { method: 'post', template: `${P}/themes`, cap: Capability.ThemeCreate },
  { method: 'post', template: `${P}/themes/{id}/duplicate`, cap: Capability.ThemeCreate },
  { method: 'patch', template: `${P}/themes/{id}`, cap: Capability.ThemeUpdate },
  { method: 'delete', template: `${P}/themes/{id}`, cap: Capability.ThemeDelete },
  // attribute definitions
  { method: 'get', template: `${P}/attribute-definitions`, cap: Capability.AttributeRead },
  { method: 'get', template: `${P}/attribute-definitions/{id}`, cap: Capability.AttributeRead },
  { method: 'post', template: `${P}/attribute-definitions`, cap: Capability.AttributeCreate },
  { method: 'patch', template: `${P}/attribute-definitions/{id}`, cap: Capability.AttributeUpdate },
  {
    method: 'delete',
    template: `${P}/attribute-definitions/{id}`,
    cap: Capability.AttributeDelete,
  },
  // event definitions
  { method: 'get', template: `${P}/event-definitions`, cap: Capability.EventRead },
  { method: 'get', template: `${P}/event-definitions/{id}`, cap: Capability.EventRead },
  { method: 'post', template: `${P}/event-definitions`, cap: Capability.EventCreate },
  { method: 'patch', template: `${P}/event-definitions/{id}`, cap: Capability.EventUpdate },
  { method: 'delete', template: `${P}/event-definitions/{id}`, cap: Capability.EventDelete },
  // segments (project-level definitions)
  { method: 'get', template: `${P}/segments`, cap: Capability.SegmentRead },
  { method: 'get', template: `${P}/segments/{id}`, cap: Capability.SegmentRead },
  { method: 'post', template: `${P}/segments`, cap: Capability.SegmentCreate },
  { method: 'patch', template: `${P}/segments/{id}`, cap: Capability.SegmentUpdate },
  { method: 'delete', template: `${P}/segments/{id}`, cap: Capability.SegmentDelete },
  // segment membership (environment-level)
  {
    method: 'put',
    template: `${E}/segments/{id}/members/{externalId}`,
    cap: Capability.SegmentUpdate,
  },
  {
    method: 'delete',
    template: `${E}/segments/{id}/members/{externalId}`,
    cap: Capability.SegmentUpdate,
  },
  // environments
  { method: 'get', template: `${P}/environments`, cap: Capability.EnvironmentRead },
  { method: 'get', template: `${P}/environments/{id}`, cap: Capability.EnvironmentRead },
  { method: 'post', template: `${P}/environments`, cap: Capability.EnvironmentManage },
  { method: 'patch', template: `${P}/environments/{id}`, cap: Capability.EnvironmentManage },
  { method: 'delete', template: `${P}/environments/{id}`, cap: Capability.EnvironmentManage },
  // end users
  { method: 'get', template: `${E}/users`, cap: Capability.UserRead },
  { method: 'get', template: `${E}/users/{id}`, cap: Capability.UserRead },
  { method: 'put', template: `${E}/users/{id}`, cap: Capability.UserWrite },
  { method: 'delete', template: `${E}/users/{id}`, cap: Capability.UserDelete },
  // companies + memberships
  { method: 'get', template: `${E}/companies`, cap: Capability.CompanyRead },
  { method: 'get', template: `${E}/companies/{id}`, cap: Capability.CompanyRead },
  { method: 'put', template: `${E}/companies/{id}`, cap: Capability.CompanyWrite },
  { method: 'delete', template: `${E}/companies/{id}`, cap: Capability.CompanyDelete },
  {
    method: 'put',
    template: `${E}/companies/{id}/memberships/{userId}`,
    cap: Capability.CompanyWrite,
  },
  {
    method: 'delete',
    template: `${E}/companies/{id}/memberships/{userId}`,
    cap: Capability.CompanyWrite,
  },
  // sessions
  { method: 'get', template: `${E}/sessions`, cap: Capability.SessionRead },
  { method: 'get', template: `${E}/sessions/{id}`, cap: Capability.SessionRead },
  { method: 'delete', template: `${E}/sessions/{id}`, cap: Capability.SessionManage },
  { method: 'post', template: `${E}/sessions/{id}/end`, cap: Capability.SessionManage },
  // webhooks
  { method: 'get', template: `${E}/webhooks`, cap: Capability.WebhookRead },
  { method: 'get', template: `${E}/webhooks/{id}`, cap: Capability.WebhookRead },
  { method: 'post', template: `${E}/webhooks`, cap: Capability.WebhookManage },
  { method: 'patch', template: `${E}/webhooks/{id}`, cap: Capability.WebhookManage },
  { method: 'delete', template: `${E}/webhooks/{id}`, cap: Capability.WebhookManage },
  { method: 'post', template: `${E}/webhooks/{id}/rotate-secret`, cap: Capability.WebhookManage },
];

const HTTP_METHODS = new Set(['get', 'post', 'patch', 'put', 'delete', 'head', 'options']);

describe('API v2 capability matrix (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let projectId: string;
  let environmentId: string;

  // One minted token per capability, holding every capability EXCEPT that one.
  const tokenWithoutCap = new Map<Capability, string>();

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  async function tokenWithout(cap: Capability): Promise<string> {
    const cached = tokenWithoutCap.get(cap);
    if (cached) {
      return cached;
    }
    const scopes = Object.values(Capability).filter((c) => c !== cap);
    const res = await graphql(app, {
      query: CREATE,
      variables: {
        input: {
          name: `no-${cap}`,
          scopes,
          projectIds: [projectId],
          environmentIds: [environmentId],
        },
      },
      token: ownerToken,
    });
    const token = gqlData(res).createApiToken.token as string;
    tokenWithoutCap.set(cap, token);
    return token;
  }

  function fill(template: string): string {
    return (
      template
        .replace('{projectId}', projectId)
        .replace('{environmentId}', environmentId)
        // Never resolved under a deny: the guard rejects before any handler or
        // service touches these ids.
        .replace(/\{[^}]+\}/g, 'x-never-resolved')
    );
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    projectId = (await buildProject(prisma, { name: 'api-v2-cap-matrix' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId })).id;
    ownerToken = (await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' })).token;
  }, 60000);

  afterAll(async () => {
    await teardownProject(prisma, projectId);
    await app.close();
  });

  for (const row of ROUTES) {
    it(`${row.method.toUpperCase()} ${row.template} — 401 bare, 403 without ${row.cap}`, async () => {
      const path = fill(row.template);
      const server = app.getHttpServer();

      const bare = await request(server)[row.method](path);
      expect(bare.status).toBe(401);
      expect(bare.body.error.code).toBe('E1010');

      const denied = await request(server)
        [row.method](path)
        .set('Authorization', `Bearer ${await tokenWithout(row.cap)}`);
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe('E1012');
    });
  }

  it('the table covers every route in the v2 OpenAPI document — and nothing more', () => {
    const config = new DocumentBuilder().setTitle('v2').setVersion('2.0').addBearerAuth().build();
    const doc = SwaggerModule.createDocument(app, config, { include: [ApiModule] });
    const docRoutes: string[] = [];
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const method of Object.keys(item)) {
        if (HTTP_METHODS.has(method)) {
          docRoutes.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }
    const tableRoutes = ROUTES.map((r) => `${r.method.toUpperCase()} ${r.template}`);
    expect(docRoutes.sort()).toEqual(tableRoutes.sort());
  });
});
