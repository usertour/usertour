import { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildMembership, buildProject, buildUser } from '../factories';
import { teardownProject } from './_support';

/**
 * Force-SSO enforcement e2e. A project with `requireSso = true` must reject
 * every non-SSO login (password here) for its non-owner members, while letting
 * the project OWNER and system admins through — the break-glass that keeps an
 * IdP outage from locking out the people who can fix it. Drives the real `login`
 * mutation → `emailLogin` → `issueTokensOrChallenge` gate, and asserts the error
 * code, the `projectId` carried in the error extensions (so the client can route
 * to SSO), and the absence of an issued session.
 *
 * Enforcement is independent of plan entitlement, so `requireSso` is seeded
 * directly — no subscription / SaaS-mode dance needed.
 */
describe('GraphQL force-SSO login (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let enforcedProjectId: string;
  let openProjectId: string;
  const userIds: string[] = [];
  const PASSWORD = 'ForceSso123!';

  const login = (email: string, password: string) =>
    graphql(app, {
      query: `mutation ($data: LoginInput!) {
        login(data: $data) { accessToken requiresTwoFactor }
      }`,
      variables: { data: { email, password } },
    });

  // A user with a known argon2 password, an email Account (login requires one),
  // and a single membership in `projectId` with `role`.
  const seedMember = async (
    label: string,
    projectId: string,
    role: 'OWNER' | 'ADMIN' | 'VIEWER',
    extra: Record<string, unknown> = {},
  ) => {
    const email = `force-${label}-${Date.now()}@acme.com`;
    const user = await buildUser(prisma, {
      email,
      password: await argon2.hash(PASSWORD),
      ...extra,
    });
    userIds.push(user.id);
    await prisma.account.create({
      data: { type: 'email', userId: user.id, provider: 'email', providerAccountId: email },
    });
    await buildMembership(prisma, { userId: user.id, projectId, role: role as never });
    return user;
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const enforced = await buildProject(prisma, { name: 'force-sso-on' });
    enforcedProjectId = enforced.id;
    await prisma.projectSsoSettings.create({
      data: { projectId: enforcedProjectId, requireSso: true },
    });

    const open = await buildProject(prisma, { name: 'force-sso-off' });
    openProjectId = open.id;
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userOnProject.deleteMany({ where: { userId: { in: userIds } } });
      await teardownProject(prisma, enforcedProjectId);
      await teardownProject(prisma, openProjectId);
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
  });

  it('blocks a non-owner member (E0051 + the enforcing projectId)', async () => {
    const member = await seedMember('member', enforcedProjectId, 'VIEWER');

    const res = await login(member.email!, PASSWORD);
    const error = res.body.errors?.[0];
    expect(error?.extensions?.code).toBe('E0051');
    expect(error?.extensions?.projectId).toBe(enforcedProjectId);

    // No session was issued — the gate fires before tokens are minted.
    const tokens = await prisma.refreshToken.count({ where: { userId: member.id } });
    expect(tokens).toBe(0);
  });

  it('lets the project OWNER sign in with a password (break-glass)', async () => {
    const owner = await seedMember('owner', enforcedProjectId, 'OWNER');
    const auth = gqlData(await login(owner.email!, PASSWORD)).login;
    expect(typeof auth.accessToken).toBe('string');
  });

  it('lets a system admin sign in even as a non-owner member (break-glass)', async () => {
    const admin = await seedMember('sysadmin', enforcedProjectId, 'VIEWER', {
      isSystemAdmin: true,
    });
    const auth = gqlData(await login(admin.email!, PASSWORD)).login;
    expect(typeof auth.accessToken).toBe('string');
  });

  it('does not block a member of a project that does not enforce SSO', async () => {
    const member = await seedMember('open', openProjectId, 'VIEWER');
    const auth = gqlData(await login(member.email!, PASSWORD)).login;
    expect(typeof auth.accessToken).toBe('string');
  });
});
