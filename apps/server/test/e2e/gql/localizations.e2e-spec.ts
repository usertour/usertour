import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildMembership, buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * Functional e2e for the `localizations` GraphQL resolver — follows the themes
 * template: run as an authorized OWNER, assert each mutation's effect in the DB
 * (not just the response), cover key read/error cases. Auth (who-can-call) is
 * already covered by permission.e2e-spec; here we run as OWNER.
 *
 * Localization has `@@unique([projectId, code])` (and projectId+locale), so
 * every created row uses a distinct code/locale to avoid collisions.
 */
describe('GraphQL localizations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let ownerId: string;
  let token: string;
  const userIds: string[] = [];
  const extraProjectIds: string[] = [];

  let seq = 0;
  const tag = () => `loc-${Date.now()}-${seq++}`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-localizations' });
    projectId = project.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    token = owner.token;
    ownerId = owner.user.id;
    userIds.push(owner.user.id);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      for (const id of extraProjectIds) {
        await teardownProject(prisma, id);
      }
      await teardownProject(prisma, projectId);
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
  });

  const createLocalization = (
    overrides: Partial<{ name: string; locale: string; code: string }> = {},
  ) => {
    const slug = tag();
    return graphql(app, {
      token,
      query: `mutation ($data: CreateLocalizationInput!) {
        createLocalization(data: $data) { id name locale code isDefault projectId }
      }`,
      variables: {
        data: { name: slug, locale: slug, code: slug, projectId, ...overrides },
      },
    });
  };

  describe('createLocalization', () => {
    it('creates a localization and persists it', async () => {
      const slug = tag();
      const loc = gqlData(
        await createLocalization({ name: slug, locale: slug, code: slug }),
      ).createLocalization;
      expect(loc).toMatchObject({
        name: slug,
        locale: slug,
        code: slug,
        isDefault: false,
        projectId,
      });

      const row = await prisma.localization.findUnique({ where: { id: loc.id } });
      expect(row).toMatchObject({
        name: slug,
        locale: slug,
        code: slug,
        projectId,
        isDefault: false,
      });
    });

    it('errors creating a duplicate code in the same project', async () => {
      const slug = tag();
      gqlData(await createLocalization({ name: slug, locale: slug, code: slug }));

      const res = await createLocalization({ name: tag(), locale: tag(), code: slug });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('listLocalizations', () => {
    it('lists localizations for the project', async () => {
      const created = gqlData(await createLocalization()).createLocalization;
      const res = await graphql(app, {
        token,
        query:
          'query ($projectId: String!) { listLocalizations(projectId: $projectId) { id name } }',
        variables: { projectId },
      });
      const ids = gqlData(res).listLocalizations.map((l: { id: string }) => l.id);
      expect(ids).toContain(created.id);
    });

    it('returns an empty list for a project with no localizations', async () => {
      // Fresh project with the same owner as a member so the permission guard
      // passes; it has no localizations yet.
      const empty = await buildProject(prisma, { name: 'gql-localizations-empty' });
      extraProjectIds.push(empty.id);
      await buildMembership(prisma, { userId: ownerId, projectId: empty.id, role: 'OWNER' });

      const res = await graphql(app, {
        token,
        query: 'query ($projectId: String!) { listLocalizations(projectId: $projectId) { id } }',
        variables: { projectId: empty.id },
      });
      expect(gqlData(res).listLocalizations).toEqual([]);
    });
  });

  describe('updateLocalization', () => {
    it('updates the name and persists it', async () => {
      const created = gqlData(await createLocalization()).createLocalization;
      const newName = tag();
      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: UpdateLocalizationInput!) { updateLocalization(data: $data) { id name } }',
        variables: { data: { id: created.id, name: newName } },
      });
      expect(gqlData(res).updateLocalization).toMatchObject({ id: created.id, name: newName });

      const row = await prisma.localization.findUnique({ where: { id: created.id } });
      expect(row?.name).toBe(newName);
    });

    it('errors updating an unknown localization', async () => {
      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: UpdateLocalizationInput!) { updateLocalization(data: $data) { id } }',
        variables: { data: { id: 'does-not-exist', name: 'x' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('setDefaultLocalization', () => {
    it('makes a localization default and unsets the previous default', async () => {
      const a = gqlData(await createLocalization()).createLocalization;
      const b = gqlData(await createLocalization()).createLocalization;

      // Make A the default first.
      gqlData(
        await graphql(app, {
          token,
          query: 'mutation ($id: String!) { setDefaultLocalization(id: $id) { id isDefault } }',
          variables: { id: a.id },
        }),
      );

      // Now flip the default to B.
      const res = await graphql(app, {
        token,
        query: 'mutation ($id: String!) { setDefaultLocalization(id: $id) { id isDefault } }',
        variables: { id: b.id },
      });
      expect(gqlData(res).setDefaultLocalization).toMatchObject({ id: b.id, isDefault: true });

      const [rowA, rowB] = await Promise.all([
        prisma.localization.findUnique({ where: { id: a.id } }),
        prisma.localization.findUnique({ where: { id: b.id } }),
      ]);
      expect(rowB?.isDefault).toBe(true);
      expect(rowA?.isDefault).toBe(false);
    });

    it('errors for an unknown localization', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($id: String!) { setDefaultLocalization(id: $id) { id } }',
        variables: { id: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('deleteLocalization', () => {
    it('hard-deletes a non-default localization', async () => {
      const loc = gqlData(await createLocalization()).createLocalization;
      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: DeleteLocalizationInput!) { deleteLocalization(data: $data) { id } }',
        variables: { data: { id: loc.id } },
      });
      expect(gqlData(res).deleteLocalization).toMatchObject({ id: loc.id });

      const row = await prisma.localization.findUnique({ where: { id: loc.id } });
      expect(row).toBeNull();
    });

    it('errors deleting a default localization', async () => {
      const loc = gqlData(await createLocalization()).createLocalization;
      gqlData(
        await graphql(app, {
          token,
          query: 'mutation ($id: String!) { setDefaultLocalization(id: $id) { id isDefault } }',
          variables: { id: loc.id },
        }),
      );

      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: DeleteLocalizationInput!) { deleteLocalization(data: $data) { id } }',
        variables: { data: { id: loc.id } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      // Still present (delete was rejected for being the default).
      const row = await prisma.localization.findUnique({ where: { id: loc.id } });
      expect(row).not.toBeNull();
    });
  });
});
