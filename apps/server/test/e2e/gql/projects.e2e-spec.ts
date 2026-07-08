import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * Functional e2e for the `projects` GraphQL resolver — follows the themes
 * template: run as OWNER, assert each mutation's effect in the DB (not just the
 * response), and assert the shape of the read queries. Auth (who-can-call) is
 * already covered by permission.e2e-spec; here we run as OWNER.
 */
describe('GraphQL projects (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let token: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-projects' });
    projectId = project.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    token = owner.token;
    userIds.push(owner.user.id);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await teardownProject(prisma, projectId);
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
  });

  describe('getProjectConfig', () => {
    it('returns the project config shape', async () => {
      const res = await graphql(app, {
        token,
        query:
          'query ($projectId: String!) { getProjectConfig(projectId: $projectId) { removeBranding planType } }',
        variables: { projectId },
      });
      const config = gqlData(res).getProjectConfig;
      expect(config).toEqual({
        removeBranding: expect.any(Boolean),
        planType: expect.any(String),
      });
    });
  });

  describe('getProjectLicenseInfo', () => {
    it('returns null for a project with no license', async () => {
      const res = await graphql(app, {
        token,
        query:
          'query ($projectId: String!) { getProjectLicenseInfo(projectId: $projectId) { isValid isExpired error daysRemaining } }',
        variables: { projectId },
      });
      // A project with no license resolves to null (service returns null).
      expect(gqlData(res).getProjectLicenseInfo).toBeNull();
    });
  });

  describe('updateProject', () => {
    it('updates the name and persists it', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($projectId: String!, $name: String!) {
          updateProject(projectId: $projectId, name: $name) { id name }
        }`,
        variables: { projectId, name: 'Renamed Project' },
      });
      expect(gqlData(res).updateProject).toMatchObject({
        id: projectId,
        name: 'Renamed Project',
      });

      const row = await prisma.project.findUnique({ where: { id: projectId } });
      expect(row?.name).toBe('Renamed Project');
    });
  });

  describe('updateProjectLicense', () => {
    it('errors for an invalid license and leaves the license unchanged', async () => {
      const before = await prisma.project.findUnique({ where: { id: projectId } });

      const res = await graphql(app, {
        token,
        query: `mutation ($projectId: String!, $license: String!) {
          updateProjectLicense(projectId: $projectId, license: $license) { id license }
        }`,
        variables: { projectId, license: 'not-a-valid-license-token' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const after = await prisma.project.findUnique({ where: { id: projectId } });
      expect(after?.license).toBe(before?.license ?? null);
    });
  });
});
