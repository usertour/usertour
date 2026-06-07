import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * Functional e2e for the `themes` GraphQL resolver — the template the other
 * resolver specs follow: run as an authorized user, assert each mutation's
 * effect in the DB (not just the response), cover key read/error cases. Auth
 * (who-can-call) is already covered by permission.e2e-spec; here we run as OWNER.
 */
describe('GraphQL themes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let token: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-themes' });
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

  const createTheme = (
    name: string,
    isDefault = false,
    settings: Record<string, unknown> = { primaryColor: '#ffffff' },
  ) =>
    graphql(app, {
      token,
      query: `mutation ($data: CreateThemeInput!) {
        createTheme(data: $data) { id name isDefault projectId settings }
      }`,
      variables: { data: { name, isDefault, projectId, settings } },
    });

  describe('createTheme', () => {
    it('creates a theme and persists it', async () => {
      const theme = gqlData(await createTheme('Brand A')).createTheme;
      expect(theme).toMatchObject({ name: 'Brand A', isDefault: false, projectId });
      expect(theme.settings).toEqual({ primaryColor: '#ffffff' });

      const row = await prisma.theme.findUnique({ where: { id: theme.id } });
      expect(row).toMatchObject({ name: 'Brand A', projectId, isDefault: false });
    });
  });

  describe('getTheme / listThemes', () => {
    it('reads a theme by id', async () => {
      const created = gqlData(await createTheme('Readable')).createTheme;
      const res = await graphql(app, {
        token,
        query: 'query ($themeId: String!) { getTheme(themeId: $themeId) { id name } }',
        variables: { themeId: created.id },
      });
      expect(gqlData(res).getTheme).toMatchObject({ id: created.id, name: 'Readable' });
    });

    it('lists themes for the project', async () => {
      const created = gqlData(await createTheme('Listed')).createTheme;
      const res = await graphql(app, {
        token,
        query: 'query ($projectId: String!) { listThemes(projectId: $projectId) { id name } }',
        variables: { projectId },
      });
      const ids = gqlData(res).listThemes.map((t: { id: string }) => t.id);
      expect(ids).toContain(created.id);
    });

    it('errors for an unknown theme', async () => {
      const res = await graphql(app, {
        token,
        query: 'query ($themeId: String!) { getTheme(themeId: $themeId) { id } }',
        variables: { themeId: 'does-not-exist' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('updateTheme', () => {
    it('updates the name and persists it', async () => {
      const created = gqlData(await createTheme('Before')).createTheme;
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: UpdateThemeInput!) { updateTheme(data: $data) { id name } }',
        variables: { data: { id: created.id, name: 'After' } },
      });
      expect(gqlData(res).updateTheme).toMatchObject({ id: created.id, name: 'After' });

      const row = await prisma.theme.findUnique({ where: { id: created.id } });
      expect(row?.name).toBe('After');
    });

    it('errors updating an unknown theme', async () => {
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: UpdateThemeInput!) { updateTheme(data: $data) { id } }',
        variables: { data: { id: 'does-not-exist', name: 'x' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('setDefaultTheme', () => {
    it('makes a theme default and unsets the previous default', async () => {
      const a = gqlData(await createTheme('Default A', true)).createTheme;
      const b = gqlData(await createTheme('Default B', false)).createTheme;

      const res = await graphql(app, {
        token,
        query:
          'mutation ($themeId: String!) { setDefaultTheme(themeId: $themeId) { id isDefault } }',
        variables: { themeId: b.id },
      });
      expect(gqlData(res).setDefaultTheme).toMatchObject({ id: b.id, isDefault: true });

      const [rowA, rowB] = await Promise.all([
        prisma.theme.findUnique({ where: { id: a.id } }),
        prisma.theme.findUnique({ where: { id: b.id } }),
      ]);
      expect(rowB?.isDefault).toBe(true);
      expect(rowA?.isDefault).toBe(false);
    });
  });

  describe('copyTheme', () => {
    it('copies a theme into a new row', async () => {
      const src = gqlData(
        await createTheme('Source', false, { primaryColor: '#abcabc' }),
      ).createTheme;
      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: CopyThemeInput!) { copyTheme(data: $data) { id name isDefault settings } }',
        variables: { data: { id: src.id, name: 'Copy' } },
      });
      const copy = gqlData(res).copyTheme;
      expect(copy.id).not.toBe(src.id);
      expect(copy).toMatchObject({ name: 'Copy', isDefault: false });
      expect(copy.settings).toEqual({ primaryColor: '#abcabc' });

      const row = await prisma.theme.findUnique({ where: { id: copy.id } });
      expect(row).not.toBeNull();
    });
  });

  describe('deleteTheme', () => {
    it('deletes a non-default theme', async () => {
      const t = gqlData(await createTheme('Trash')).createTheme;
      const res = await graphql(app, {
        token,
        query: 'mutation ($data: DeleteThemeInput!) { deleteTheme(data: $data) { id } }',
        variables: { data: { id: t.id } },
      });
      expect(gqlData(res).deleteTheme).toMatchObject({ id: t.id });

      const row = await prisma.theme.findUnique({ where: { id: t.id } });
      expect(row).toBeNull();
    });
  });
});
