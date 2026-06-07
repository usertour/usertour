import { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData, signToken } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildProject, buildUser, buildMembership } from '../factories';
import { teardownProject } from './_support';

/**
 * Functional e2e for the `users` GraphQL resolver. These ops are self-scoped —
 * there is no project permission guard; auth is simply "are you logged in".
 * So instead of one shared OWNER, most tests build a fresh user, sign a JWT for
 * them, run the op, and assert the effect in the DB. Every created user id and
 * every created project id is tracked and torn down in afterAll.
 */
describe('GraphQL users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const userIds: string[] = [];
  const projectIds: string[] = [];

  // argon2 hash exactly the way PasswordService.hashPassword does, so we know
  // the plaintext that matches a user's stored hash.
  const hashPassword = (password: string) => argon2.hash(password);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      for (const projectId of projectIds) {
        await teardownProject(prisma, projectId);
      }
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
  });

  /** Build a user, track it for cleanup, and return it with a signed token. */
  const authUser = async (overrides: Record<string, unknown> = {}) => {
    const user = await buildUser(prisma, overrides);
    userIds.push(user.id);
    return { user, token: signToken(app, user.id) };
  };

  describe('me', () => {
    it('returns the current user from the JWT', async () => {
      const { user, token } = await authUser({ name: 'Self', avatarUrl: 'https://a/x.png' });
      const res = await graphql(app, {
        token,
        query: 'query { me { id email name avatarUrl } }',
      });
      expect(gqlData(res).me).toMatchObject({
        id: user.id,
        email: user.email,
        name: 'Self',
        avatarUrl: 'https://a/x.png',
      });
    });

    it('errors without a token', async () => {
      const res = await graphql(app, { query: 'query { me { id } }' });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('updateUser', () => {
    it('updates name + avatarUrl and persists it', async () => {
      const { user, token } = await authUser({ name: 'Old' });
      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: UpdateUserInput!) { updateUser(data: $data) { id name avatarUrl } }',
        variables: { data: { name: 'New Name', avatarUrl: 'https://cdn/new.png' } },
      });
      expect(gqlData(res).updateUser).toMatchObject({
        id: user.id,
        name: 'New Name',
        avatarUrl: 'https://cdn/new.png',
      });

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row).toMatchObject({ name: 'New Name', avatarUrl: 'https://cdn/new.png' });
    });
  });

  describe('changePassword', () => {
    it('changes the password hash for a valid old password', async () => {
      const password = await hashPassword('OldPass123!');
      const { user, token } = await authUser({ password });

      const res = await graphql(app, {
        token,
        query: 'mutation ($data: ChangePasswordInput!) { changePassword(data: $data) { id } }',
        variables: { data: { oldPassword: 'OldPass123!', newPassword: 'NewPass456!' } },
      });
      expect(gqlData(res).changePassword).toMatchObject({ id: user.id });

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.password).not.toBe(password);
      // The new hash verifies against the new plaintext, not the old one.
      await expect(argon2.verify(row!.password, 'NewPass456!')).resolves.toBe(true);
      await expect(argon2.verify(row!.password, 'OldPass123!')).resolves.toBe(false);
    });

    it('errors for a wrong old password and leaves the hash unchanged', async () => {
      const password = await hashPassword('CorrectOld1!');
      const { user, token } = await authUser({ password });

      const res = await graphql(app, {
        token,
        query: 'mutation ($data: ChangePasswordInput!) { changePassword(data: $data) { id } }',
        variables: { data: { oldPassword: 'WrongOld99!', newPassword: 'Whatever12!' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.password).toBe(password);
    });
  });

  describe('changeEmail', () => {
    it('changes the email for a valid password and persists it', async () => {
      const password = await hashPassword('EmailPass1!');
      const { user, token } = await authUser({ password });
      const newEmail = `changed-${user.id}@test.local`;

      const res = await graphql(app, {
        token,
        query: 'mutation ($data: ChangeEmailInput!) { changeEmail(data: $data) { id email } }',
        variables: { data: { email: newEmail, password: 'EmailPass1!' } },
      });
      expect(gqlData(res).changeEmail).toMatchObject({ id: user.id, email: newEmail });

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.email).toBe(newEmail);
    });

    it('errors for a wrong password and leaves the email unchanged', async () => {
      const password = await hashPassword('EmailPass2!');
      const { user, token } = await authUser({ password });

      const res = await graphql(app, {
        token,
        query: 'mutation ($data: ChangeEmailInput!) { changeEmail(data: $data) { id email } }',
        variables: { data: { email: 'hijack@test.local', password: 'WrongPass9!' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.email).toBe(user.email);
    });
  });

  describe('createOwnedProject', () => {
    it('creates a Project + OWNER membership for a user with zero projects', async () => {
      const { user, token } = await authUser();

      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: CreateOwnedProjectInput!) { createOwnedProject(data: $data) { id name } }',
        variables: { data: { name: 'My Owned Project' } },
      });
      const project = gqlData(res).createOwnedProject;
      expect(project).toMatchObject({ name: 'My Owned Project' });
      projectIds.push(project.id);

      const projectRow = await prisma.project.findUnique({ where: { id: project.id } });
      expect(projectRow).toMatchObject({ name: 'My Owned Project' });

      const membership = await prisma.userOnProject.findFirst({
        where: { userId: user.id, projectId: project.id },
      });
      expect(membership).toMatchObject({ role: 'OWNER', actived: true });
    });

    it('errors when the user already belongs to a project', async () => {
      const project = await buildProject(prisma, { name: 'pre-existing' });
      projectIds.push(project.id);
      const { token } = await authUser();
      // Make this user already a member of a project.
      await buildMembership(prisma, {
        userId: userIds[userIds.length - 1],
        projectId: project.id,
        role: 'OWNER' as never,
      });

      const res = await graphql(app, {
        token,
        query:
          'mutation ($data: CreateOwnedProjectInput!) { createOwnedProject(data: $data) { id } }',
        variables: { data: { name: 'Second Project' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('projects (ResolveField on User)', () => {
    it('lists the projects the user is a member of', async () => {
      const project = await buildProject(prisma, { name: 'membered' });
      projectIds.push(project.id);
      const { user, token } = await authUser();
      await buildMembership(prisma, {
        userId: user.id,
        projectId: project.id,
        role: 'ADMIN' as never,
      });

      const res = await graphql(app, {
        token,
        query: 'query { me { id projects { role actived project { id name } } } }',
      });
      const projects = gqlData(res).me.projects;
      const match = projects.find((p: { project: { id: string } }) => p.project.id === project.id);
      expect(match).toMatchObject({
        role: 'ADMIN',
        actived: true,
        project: { id: project.id, name: 'membered' },
      });
    });
  });
});
