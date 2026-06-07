import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import {
  buildAccessToken,
  buildEnvironment,
  buildMembership,
  buildProject,
  buildSubscription,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * Functional e2e for the `environments` GraphQL resolver — follows the themes
 * template: run as an authorized OWNER, assert each mutation's effect in the DB
 * (not just the response), cover key read/error cases. Auth (who-can-call) is
 * already covered by permission.e2e-spec; here we run as OWNER.
 *
 * Service semantics worth noting:
 *  - create: the first non-deleted env in a project is auto-promoted to primary.
 *  - delete: soft-deletes (`deleted: true`); refuses the primary env and the
 *    last remaining env in a project.
 *  - access tokens: the resolver returns the token string prefixed with `ak_`
 *    (full on get/create, masked on list).
 */
describe('GraphQL environments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let primaryEnvId: string;
  let token: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-environments' });
    projectId = project.id;
    // The e2e app runs in cloud mode, so env-creation is plan-gated. A BUSINESS
    // subscription gives `environmentLimit: 'unlimited'`, clearing the runway for
    // every createEnvironments call below.
    await buildSubscription(prisma, { projectId });
    // Seed a primary env so later `createEnvironments` calls aren't auto-promoted
    // to primary (which would block delete) and the project always has >1 env.
    const primary = await buildEnvironment(prisma, { projectId, isPrimary: true });
    primaryEnvId = primary.id;

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

  const createEnvironment = (name: string) =>
    graphql(app, {
      token,
      query: `mutation ($data: CreateEnvironmentInput!) {
        createEnvironments(data: $data) { id name projectId isPrimary token }
      }`,
      variables: { data: { name, projectId } },
    });

  describe('createEnvironments', () => {
    it('creates an environment and persists it', async () => {
      const env = gqlData(await createEnvironment('Env A')).createEnvironments;
      expect(env).toMatchObject({ name: 'Env A', projectId, isPrimary: false });
      expect(typeof env.token).toBe('string');

      const row = await prisma.environment.findUnique({ where: { id: env.id } });
      expect(row).toMatchObject({ name: 'Env A', projectId, isPrimary: false, deleted: false });
    });

    it('errors for an unknown project', async () => {
      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: CreateEnvironmentInput!) { createEnvironments(data: $data) { id } }',
        variables: { data: { name: 'No Project', projectId: 'does-not-exist' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('userEnvironments', () => {
    it('lists non-deleted environments for the project', async () => {
      const created = gqlData(await createEnvironment('Listed')).createEnvironments;
      const res = await graphql(app, {
        token,
        query:
          'query ($projectId: String!) { userEnvironments(projectId: $projectId) { id name isPrimary } }',
        variables: { projectId },
      });
      const envs = gqlData(res).userEnvironments;
      const ids = envs.map((e: { id: string }) => e.id);
      expect(ids).toContain(created.id);
      expect(ids).toContain(primaryEnvId);
    });

    it('returns an empty list for a project with no environments', async () => {
      const empty = await buildProject(prisma, { name: 'gql-environments-empty' });
      // The owner needs project membership for the Project-scoped read guard.
      await buildMembership(prisma, { userId: userIds[0], projectId: empty.id, role: 'OWNER' });
      const res = await graphql(app, {
        token,
        query: 'query ($projectId: String!) { userEnvironments(projectId: $projectId) { id } }',
        variables: { projectId: empty.id },
      });
      expect(gqlData(res).userEnvironments).toEqual([]);
      await prisma.userOnProject.deleteMany({ where: { projectId: empty.id } });
      await prisma.project.delete({ where: { id: empty.id } });
    });
  });

  describe('updateEnvironments', () => {
    it('updates the name and persists it', async () => {
      const created = gqlData(await createEnvironment('Before')).createEnvironments;
      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: UpdateEnvironmentInput!) { updateEnvironments(data: $data) { id name } }',
        variables: { data: { id: created.id, name: 'After' } },
      });
      expect(gqlData(res).updateEnvironments).toMatchObject({ id: created.id, name: 'After' });

      const row = await prisma.environment.findUnique({ where: { id: created.id } });
      expect(row?.name).toBe('After');
    });

    it('makes an environment primary and unsets the previous primary', async () => {
      const created = gqlData(await createEnvironment('Promote Me')).createEnvironments;
      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: UpdateEnvironmentInput!) { updateEnvironments(data: $data) { id isPrimary } }',
        variables: { data: { id: created.id, name: 'Promote Me', isPrimary: true } },
      });
      expect(gqlData(res).updateEnvironments).toMatchObject({ id: created.id, isPrimary: true });

      const [promoted, previous] = await Promise.all([
        prisma.environment.findUnique({ where: { id: created.id } }),
        prisma.environment.findUnique({ where: { id: primaryEnvId } }),
      ]);
      expect(promoted?.isPrimary).toBe(true);
      expect(previous?.isPrimary).toBe(false);

      // Restore the seeded primary so delete-guard assumptions hold for later tests.
      await graphql(app, {
        token,
        query:
          'mutation ($data: UpdateEnvironmentInput!) { updateEnvironments(data: $data) { id isPrimary } }',
        variables: { data: { id: primaryEnvId, name: 'primary', isPrimary: true } },
      });
    });

    it('errors updating an unknown environment', async () => {
      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: UpdateEnvironmentInput!) { updateEnvironments(data: $data) { id } }',
        variables: { data: { id: 'does-not-exist', name: 'x' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('deleteEnvironments', () => {
    it('soft-deletes a non-primary environment', async () => {
      const created = gqlData(await createEnvironment('Trash')).createEnvironments;
      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: DeleteEnvironmentInput!) { deleteEnvironments(data: $data) { id } }',
        variables: { data: { id: created.id } },
      });
      expect(gqlData(res).deleteEnvironments).toMatchObject({ id: created.id });

      const row = await prisma.environment.findUnique({ where: { id: created.id } });
      expect(row?.deleted).toBe(true);
    });

    it('errors deleting the primary environment', async () => {
      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: DeleteEnvironmentInput!) { deleteEnvironments(data: $data) { id } }',
        variables: { data: { id: primaryEnvId } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const row = await prisma.environment.findUnique({ where: { id: primaryEnvId } });
      expect(row?.deleted).toBe(false);
    });
  });

  describe('listAccessTokens', () => {
    it('lists masked access tokens for an environment', async () => {
      const env = await buildEnvironment(prisma, { projectId });
      const created = await buildAccessToken(prisma, { environmentId: env.id });
      const res = await graphql(app, {
        token,
        query: `query ($environmentId: String!) {
          listAccessTokens(environmentId: $environmentId) { id name accessToken isActive }
        }`,
        variables: { environmentId: env.id },
      });
      const tokens = gqlData(res).listAccessTokens;
      const found = tokens.find((t: { id: string }) => t.id === created.id);
      expect(found).toBeTruthy();
      // Masked: `ak_<first4>...<last4>`, never the raw value.
      expect(found.accessToken).toBe(
        `ak_${created.accessToken.slice(0, 4)}...${created.accessToken.slice(-4)}`,
      );
      expect(found.accessToken).not.toBe(created.accessToken);
    });

    it('returns an empty list for an environment without tokens', async () => {
      const env = await buildEnvironment(prisma, { projectId });
      const res = await graphql(app, {
        token,
        query:
          'query ($environmentId: String!) { listAccessTokens(environmentId: $environmentId) { id } }',
        variables: { environmentId: env.id },
      });
      expect(gqlData(res).listAccessTokens).toEqual([]);
    });
  });

  describe('getAccessToken', () => {
    it('returns the full token, prefixed with ak_', async () => {
      const env = await buildEnvironment(prisma, { projectId });
      const created = await buildAccessToken(prisma, { environmentId: env.id });
      const res = await graphql(app, {
        token,
        query: `query ($environmentId: String!, $accessTokenId: String!) {
          getAccessToken(environmentId: $environmentId, accessTokenId: $accessTokenId)
        }`,
        variables: { environmentId: env.id, accessTokenId: created.id },
      });
      expect(gqlData(res).getAccessToken).toBe(`ak_${created.accessToken}`);
    });

    it('errors for an unknown access token', async () => {
      const env = await buildEnvironment(prisma, { projectId });
      const res = await graphql(app, {
        token,
        query: `query ($environmentId: String!, $accessTokenId: String!) {
          getAccessToken(environmentId: $environmentId, accessTokenId: $accessTokenId)
        }`,
        variables: { environmentId: env.id, accessTokenId: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('createAccessToken', () => {
    it('creates an access token and persists it', async () => {
      const env = await buildEnvironment(prisma, { projectId });
      const res = await graphql(app, {
        token,
        query: `mutation ($environmentId: String!, $input: CreateAccessTokenInput!) {
          createAccessToken(environmentId: $environmentId, input: $input) {
            id name description isActive accessToken
          }
        }`,
        variables: {
          environmentId: env.id,
          input: { name: 'CI token', description: 'used by CI' },
        },
      });
      const created = gqlData(res).createAccessToken;
      expect(created).toMatchObject({
        name: 'CI token',
        description: 'used by CI',
        isActive: true,
      });
      expect(created.accessToken.startsWith('ak_')).toBe(true);

      const row = await prisma.accessToken.findUnique({ where: { id: created.id } });
      expect(row).toMatchObject({
        name: 'CI token',
        description: 'used by CI',
        environmentId: env.id,
        isActive: true,
      });
      // The resolver returns the prefixed value; the raw row stores the bare token.
      expect(created.accessToken).toBe(`ak_${row?.accessToken}`);
    });

    it('errors when name is missing', async () => {
      const env = await buildEnvironment(prisma, { projectId });
      const res = await graphql(app, {
        token,
        query: `mutation ($environmentId: String!, $input: CreateAccessTokenInput!) {
          createAccessToken(environmentId: $environmentId, input: $input) { id }
        }`,
        variables: { environmentId: env.id, input: { description: 'no name' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('deleteAccessToken', () => {
    it('deletes an access token and removes the row', async () => {
      const env = await buildEnvironment(prisma, { projectId });
      const created = await buildAccessToken(prisma, { environmentId: env.id });
      const res = await graphql(app, {
        token,
        query: `mutation ($environmentId: String!, $accessTokenId: String!) {
          deleteAccessToken(environmentId: $environmentId, accessTokenId: $accessTokenId)
        }`,
        variables: { environmentId: env.id, accessTokenId: created.id },
      });
      expect(gqlData(res).deleteAccessToken).toBe(true);

      const row = await prisma.accessToken.findUnique({ where: { id: created.id } });
      expect(row).toBeNull();
    });

    it('errors deleting an unknown access token', async () => {
      const env = await buildEnvironment(prisma, { projectId });
      const res = await graphql(app, {
        token,
        query: `mutation ($environmentId: String!, $accessTokenId: String!) {
          deleteAccessToken(environmentId: $environmentId, accessTokenId: $accessTokenId)
        }`,
        variables: { environmentId: env.id, accessTokenId: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });
});
