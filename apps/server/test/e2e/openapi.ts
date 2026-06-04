import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { buildAccessToken, buildEnvironment, buildProject } from './factories';

export type HttpMethod = 'get' | 'post' | 'delete' | 'patch' | 'put';

export interface OpenApiCallOpts {
  method: HttpMethod;
  /** e.g. '/v1/users' or '/v1/users/abc' */
  path: string;
  /** serialized as querystring via supertest .query() */
  query?: Record<string, unknown>;
  body?: unknown;
  /** RAW accessToken value (no 'ak_' prefix); sent as `Bearer ak_<token>` */
  token?: string;
  /** escape hatch for malformed-auth tests — sets the Authorization header verbatim */
  rawAuthHeader?: string;
}

/**
 * Fire an OpenAPI REST call over HTTP. The guard reads `Authorization: Bearer
 * <token>` and strips an optional `ak_` prefix, so we send `Bearer ak_<token>`.
 * Returns the supertest Test so callers chain `.expect(...)`. For
 * missing/malformed-auth cases omit `token` or pass `rawAuthHeader`.
 */
export function openapi(app: INestApplication, opts: OpenApiCallOpts) {
  let req = request(app.getHttpServer())[opts.method](opts.path);
  if (opts.rawAuthHeader !== undefined) {
    req = req.set('Authorization', opts.rawAuthHeader);
  } else if (opts.token) {
    req = req.set('Authorization', `Bearer ak_${opts.token}`);
  }
  if (opts.query) {
    req = req.query(opts.query as Record<string, string>);
  }
  if (opts.body !== undefined) {
    req = req.send(opts.body as object);
  }
  return req;
}

export interface OpenApiFixture {
  projectId: string;
  environmentId: string;
  /** the RAW accessToken value, read back from the created row */
  apiKey: string;
  accessTokenId: string;
}

export interface SeedApiFixtureOpts {
  projectName?: string;
  /** pass false to seed a deactivated key (for the inactive-key auth case) */
  isActive?: boolean;
}

/**
 * Seed a project + environment + AccessToken, returning what an e2e spec needs
 * to authenticate and to scope teardown. `apiKey` is read back from the created
 * row because `AccessToken.accessToken` is `@default(cuid())` (server-generated).
 */
export async function seedApiFixture(
  prisma: PrismaService,
  overrides: SeedApiFixtureOpts = {},
): Promise<OpenApiFixture> {
  const project = await buildProject(prisma, {
    name: overrides.projectName ?? 'openapi-e2e',
  });
  const environment = await buildEnvironment(prisma, { projectId: project.id });
  const token = await buildAccessToken(prisma, {
    environmentId: environment.id,
    ...(overrides.isActive === false ? { isActive: false } : {}),
  });
  return {
    projectId: project.id,
    environmentId: environment.id,
    apiKey: token.accessToken,
    accessTokenId: token.id,
  };
}

/**
 * FK-ordered teardown for an OpenAPI fixture's project + environment. Deletes
 * child rows before parents, scoped to the fixture's `projectId`/`environmentId`
 * so it never touches other specs' data. Mirrors `permission.e2e-spec.ts`'s
 * afterAll, generalized to project/environment scoping (rows a given spec didn't
 * create simply match nothing). The `content.update → null editedVersionId/
 * publishedVersionId` step is required because `buildVersion` sets the
 * self-referential `Content.editedVersionId`, which otherwise blocks deleting
 * versions.
 */
export async function teardownApiFixture(prisma: PrismaService, fx: OpenApiFixture): Promise<void> {
  const { environmentId, projectId } = fx;

  await prisma.attributeOnEvent.deleteMany({ where: { event: { projectId } } });
  await prisma.bizEvent.deleteMany({ where: { bizUser: { environmentId } } });
  await prisma.bizUserOnCompany.deleteMany({ where: { bizUser: { environmentId } } });
  await prisma.bizUserOnSegment.deleteMany({ where: { segment: { projectId } } });
  await prisma.bizCompanyOnSegment.deleteMany({ where: { segment: { projectId } } });
  await prisma.bizSession.deleteMany({ where: { content: { projectId } } });
  await prisma.bizCompany.deleteMany({ where: { environmentId } });
  await prisma.bizUser.deleteMany({ where: { environmentId } });
  await prisma.step.deleteMany({ where: { version: { content: { projectId } } } });
  await prisma.contentOnEnvironment.deleteMany({ where: { content: { projectId } } });
  await prisma.content.updateMany({
    where: { projectId },
    data: { editedVersionId: null, publishedVersionId: null },
  });
  await prisma.version.deleteMany({ where: { content: { projectId } } });
  await prisma.content.deleteMany({ where: { projectId } });
  await prisma.segment.deleteMany({ where: { projectId } });
  await prisma.event.deleteMany({ where: { projectId } });
  await prisma.attribute.deleteMany({ where: { projectId } });
  await prisma.accessToken.deleteMany({ where: { environmentId } });
  await prisma.environment.deleteMany({ where: { projectId } });
  await prisma.project.deleteMany({ where: { id: projectId } });
}

export interface AuthCase {
  name: string;
  /** Authorization header value, or undefined to omit the header entirely */
  rawAuthHeader?: string;
  /** RAW token value to send as `Bearer ak_<token>` (mutually exclusive with rawAuthHeader) */
  token?: string;
  status: number;
  code: string;
}

/**
 * Cross-cutting API-key auth contract, shared by every resource spec so each can
 * loop it against one of its protected routes. The valid-key and inactive-key
 * cases are spec-specific (they need a seeded fixture) and are asserted inline.
 */
export const AUTH_CASES: AuthCase[] = [
  { name: 'missing Authorization header', rawAuthHeader: undefined, status: 401, code: 'E1010' },
  { name: 'wrong auth scheme', rawAuthHeader: 'Basic abc123', status: 401, code: 'E1010' },
  { name: 'unknown api key', token: 'definitely-not-a-real-key', status: 403, code: 'E1000' },
];
