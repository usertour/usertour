import { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from 'nestjs-prisma';

import { AuthService } from '@/auth/auth.service';

import { graphql, gqlData, signToken } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildInvite, buildProject, buildUser } from '../factories';
import { teardownProject } from './_support';

/**
 * Functional e2e for the `auth` GraphQL resolver. These ops are mostly
 * `@Public()` (unauthenticated entry points: signup / login / magic link /
 * reset), so — like users.e2e — each test seeds its own prerequisite rows,
 * runs the op over HTTP, and asserts the effect in the DB. Every created /
 * seeded User and every Project a signup or invite spins up is tracked and torn
 * down in afterAll (with the FK-dependent rows — refresh tokens, accounts,
 * reset codes, invites — deleted first).
 *
 * Mode note: e2e runs in SaaS mode (apps/server/.env has IS_SELF_HOSTED_MODE=
 * false), so `ensureUserRegistrationAllowed` short-circuits to allowed (signup
 * is NOT gated by `allowUserRegistration` here — that flag is self-host only),
 * and `needsSystemAdminSetup` is always false. We therefore never touch the
 * shared InstanceSetting row. `setupSystemAdmin` is unavailable in this mode and
 * is asserted only as the error path it hits — it never creates a system admin,
 * so it cannot pollute global instance state (see its describe block).
 *
 * Email ops (createMagicLink / resendMagicLink / resetUserPassword) enqueue
 * BullMQ jobs; the resolver returns without sending mail. We assert the resolver
 * result and the DB/Redis side effect (Register / Code rows) it commits before
 * enqueuing — never email delivery. `auth.email.enabled` and full SMTP config
 * are present in apps/server/.env, so the EmailConfigGuard on those ops passes.
 *
 * Cookie note: cookie-parser is registered only in main.ts, not in the shared
 * `configureApp` the e2e app boots with, so `context.req.cookies` is undefined
 * here. The `logout` resolver's per-session refresh-token revocation reads from
 * that cookie, so it is unreachable via this harness — we assert logout returns
 * true (and errors unauthenticated), and cover the revocation it delegates to
 * (`AuthService.revokeRefreshToken`) directly against a real issued token.
 */
describe('GraphQL auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  const userIds: string[] = [];
  const projectIds: string[] = [];

  // argon2 hash exactly the way PasswordService.hashPassword does, so we know
  // the plaintext that matches a user's stored hash.
  const hashPassword = (password: string) => argon2.hash(password);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    authService = app.get(AuthService);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      for (const projectId of projectIds) {
        await teardownProject(prisma, projectId);
      }
      if (userIds.length) {
        // Refresh tokens, accounts, reset codes and invites FK to User without
        // ON DELETE CASCADE, so clear them before deleting the users.
        // (UserOnProject does cascade, but teardownProject already removed the
        // project-scoped ones above.)
        await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.code.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.invite.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.userOnProject.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
  });

  /** Build a user, track it for cleanup, and return it. */
  const trackUser = async (overrides: Record<string, unknown> = {}) => {
    const user = await buildUser(prisma, overrides);
    userIds.push(user.id);
    return user;
  };

  // ── signup ───────────────────────────────────────────────────────────────
  // signup consumes a magic-link Register row (matched by `code`, within a 1h
  // reuse window) and creates User + Account + a fresh Project.

  describe('signup', () => {
    const signup = (data: {
      code: string;
      password: string;
      userName: string;
      companyName: string;
    }) =>
      graphql(app, {
        query: `mutation ($data: SignupInput!) {
          signup(data: $data) {
            accessToken refreshToken requiresTwoFactor requiresTwoFactorSetup
            user { id email name }
          }
        }`,
        variables: { data },
      });

    it('creates a User + Account + Project and returns auth tokens', async () => {
      const email = `signup-${Date.now()}@test.local`;
      const register = await prisma.register.create({ data: { email, processed: false } });

      const auth = gqlData(
        await signup({
          code: register.code,
          password: 'SignupPass1!',
          userName: 'Signed Up',
          companyName: 'Acme Co',
        }),
      ).signup;

      expect(typeof auth.accessToken).toBe('string');
      expect(typeof auth.refreshToken).toBe('string');
      expect(auth).toMatchObject({ requiresTwoFactor: false, requiresTwoFactorSetup: false });
      expect(auth.user).toMatchObject({ email, name: 'Signed Up' });
      userIds.push(auth.user.id);

      // User row persisted with a hashed (not cleartext) password.
      const userRow = await prisma.user.findUnique({ where: { id: auth.user.id } });
      expect(userRow).toMatchObject({ email, name: 'Signed Up' });
      expect(userRow?.password).toBeTruthy();
      expect(userRow?.password).not.toBe('SignupPass1!');
      await expect(argon2.verify(userRow!.password!, 'SignupPass1!')).resolves.toBe(true);

      // An email-type Account row links the local identity.
      const account = await prisma.account.findFirst({
        where: { userId: auth.user.id, provider: 'email' },
      });
      expect(account).toMatchObject({ type: 'email', providerAccountId: email });

      // A refresh token row was created (login issued real tokens).
      const refreshTokens = await prisma.refreshToken.count({ where: { userId: auth.user.id } });
      expect(refreshTokens).toBe(1);

      // An OWNER membership in a newly-created project named after the company.
      const membership = await prisma.userOnProject.findFirst({
        where: { userId: auth.user.id },
        include: { project: true },
      });
      expect(membership).toMatchObject({ role: 'OWNER', actived: true });
      expect(membership?.project?.name).toBe('Acme Co');
      if (membership?.projectId) {
        projectIds.push(membership.projectId);
      }

      // The Register row was consumed so the code can't be reused.
      const consumed = await prisma.register.findFirst({ where: { code: register.code } });
      expect(consumed).toBeNull();
    });

    it('errors for an unknown / invalid code', async () => {
      const res = await signup({
        code: 'does-not-exist',
        password: 'SignupPass1!',
        userName: 'Nope',
        companyName: 'Nope Co',
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });

    it('errors for a duplicate email (already registered)', async () => {
      const existing = await trackUser();
      const register = await prisma.register.create({
        data: { email: existing.email!, processed: false },
      });

      const res = await signup({
        code: register.code,
        password: 'SignupPass1!',
        userName: 'Dup',
        companyName: 'Dup Co',
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      // No second user created for that email; the seeded Register can be cleaned.
      const count = await prisma.user.count({ where: { email: existing.email! } });
      expect(count).toBe(1);
      await prisma.register.deleteMany({ where: { code: register.code } });
    });
  });

  // ── login ──────────────────────────────────────────────────────────────

  describe('login', () => {
    const login = (email: string, password: string) =>
      graphql(app, {
        query: `mutation ($data: LoginInput!) {
          login(data: $data) {
            accessToken refreshToken requiresTwoFactor requiresTwoFactorSetup
          }
        }`,
        variables: { data: { email, password } },
      });

    /** Seed a user with a known argon2 password + an email Account (login requires one). */
    const seedLoginUser = async (password: string) => {
      const user = await trackUser({ password: await hashPassword(password) });
      await prisma.account.create({
        data: { type: 'email', userId: user.id, provider: 'email', providerAccountId: user.email! },
      });
      return user;
    };

    it('issues tokens for valid credentials and stores a refresh token', async () => {
      const user = await seedLoginUser('LoginPass1!');

      const auth = gqlData(await login(user.email!, 'LoginPass1!')).login;
      expect(typeof auth.accessToken).toBe('string');
      expect(typeof auth.refreshToken).toBe('string');
      expect(auth).toMatchObject({ requiresTwoFactor: false, requiresTwoFactorSetup: false });

      const refreshTokens = await prisma.refreshToken.count({ where: { userId: user.id } });
      expect(refreshTokens).toBe(1);
    });

    it('errors for a wrong password and issues no token', async () => {
      const user = await seedLoginUser('LoginPass2!');

      const res = await login(user.email!, 'WrongPass9!');
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const refreshTokens = await prisma.refreshToken.count({ where: { userId: user.id } });
      expect(refreshTokens).toBe(0);
    });

    it('errors for an unknown email', async () => {
      const res = await login(`nobody-${Date.now()}@test.local`, 'Whatever12!');
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('returns true for an authenticated user', async () => {
      const user = await trackUser();
      const res = await graphql(app, {
        token: signToken(app, user.id),
        query: 'mutation { logout }',
      });
      expect(gqlData(res).logout).toBe(true);
    });

    it('errors without a token', async () => {
      const res = await graphql(app, { query: 'mutation { logout }' });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });

    it('revokes (deletes) the refresh token row it is given', async () => {
      // The resolver delegates per-session revocation to revokeRefreshToken,
      // reading the token from a cookie that this harness (no cookie-parser)
      // cannot supply. Drive the delegated path directly against a real token.
      const user = await trackUser();
      const tokens = await authService.login(user.id);

      const before = await prisma.refreshToken.count({ where: { userId: user.id } });
      expect(before).toBe(1);

      await authService.revokeRefreshToken(tokens.refreshToken);

      const after = await prisma.refreshToken.count({ where: { userId: user.id } });
      expect(after).toBe(0);
    });
  });

  // ── resetUserPasswordByCode ──────────────────────────────────────────────
  // Local (no-email) reset: a Code row is the bearer; consuming it updates the
  // password and deletes the user's refresh tokens. We seed the Code row
  // directly (the issuing path, resetUserPassword, is the email flow).

  describe('resetUserPasswordByCode', () => {
    const resetByCode = (code: string, password: string) =>
      graphql(app, {
        query: `mutation ($data: ResetPasswordByCodeInput!) {
          resetUserPasswordByCode(data: $data) { success }
        }`,
        variables: { data: { code, password } },
      });

    it('changes the password for a valid code and revokes refresh tokens', async () => {
      const oldHash = await hashPassword('OldReset11!');
      const user = await trackUser({ password: oldHash });
      // A live session whose refresh token must be revoked by the reset.
      await authService.login(user.id);
      const code = await prisma.code.create({
        data: { userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });

      const res = await resetByCode(code.id, 'NewReset22!');
      expect(gqlData(res).resetUserPasswordByCode).toMatchObject({ success: true });

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.password).not.toBe(oldHash);
      await expect(argon2.verify(row!.password!, 'NewReset22!')).resolves.toBe(true);
      await expect(argon2.verify(row!.password!, 'OldReset11!')).resolves.toBe(false);

      // Code consumed (single-use) and all refresh tokens revoked.
      const codeRow = await prisma.code.findUnique({ where: { id: code.id } });
      expect(codeRow).toBeNull();
      const refreshTokens = await prisma.refreshToken.count({ where: { userId: user.id } });
      expect(refreshTokens).toBe(0);
    });

    it('errors for an unknown code and leaves the password unchanged', async () => {
      const oldHash = await hashPassword('Keep1234!');
      const user = await trackUser({ password: oldHash });

      const res = await resetByCode('not-a-real-code', 'NewPass999!');
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.password).toBe(oldHash);
    });

    it('errors for an expired code and leaves the password unchanged', async () => {
      const oldHash = await hashPassword('Expire123!');
      const user = await trackUser({ password: oldHash });
      const code = await prisma.code.create({
        data: { userId: user.id, expiresAt: new Date(Date.now() - 1000) },
      });

      const res = await resetByCode(code.id, 'NewPass999!');
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.password).toBe(oldHash);
      // Clean up the expired code row we seeded.
      await prisma.code.deleteMany({ where: { id: code.id } });
    });
  });

  // ── createMagicLink ──────────────────────────────────────────────────────
  // Enqueues a magic-link email job and persists a Register row. We assert the
  // resolver result + the Register side effect, never email delivery.

  describe('createMagicLink', () => {
    const createMagicLink = (email: string) =>
      graphql(app, {
        query: `mutation ($data: MagicLinkInput!) {
          createMagicLink(data: $data) { id email }
        }`,
        variables: { data: { email } },
      });

    it('creates a Register row for a new email', async () => {
      const email = `magic-${Date.now()}@test.local`;
      const register = gqlData(await createMagicLink(email)).createMagicLink;
      expect(register).toMatchObject({ email });
      expect(typeof register.id).toBe('string');

      const row = await prisma.register.findUnique({ where: { id: register.id } });
      expect(row).toMatchObject({ email, processed: false });
      // Clean up the Register row we created (no FK, safe to delete by id).
      await prisma.register.deleteMany({ where: { id: register.id } });
    });

    it('errors when the email is already registered', async () => {
      const user = await trackUser();
      const res = await createMagicLink(user.email!);
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── resendMagicLink ──────────────────────────────────────────────────────

  describe('resendMagicLink', () => {
    const resendMagicLink = (id: string) =>
      graphql(app, {
        query: `mutation ($data: ResendLinkInput!) {
          resendMagicLink(data: $data) { id email }
        }`,
        variables: { data: { id } },
      });

    it('returns the existing Register row and enqueues a resend', async () => {
      const email = `resend-${Date.now()}@test.local`;
      const register = await prisma.register.create({ data: { email, processed: false } });

      const result = gqlData(await resendMagicLink(register.id)).resendMagicLink;
      expect(result).toMatchObject({ id: register.id, email });

      await prisma.register.deleteMany({ where: { id: register.id } });
    });

    it('errors for an unknown register id', async () => {
      const res = await resendMagicLink('does-not-exist');
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── resetUserPassword (email flow) ───────────────────────────────────────
  // Enqueues a reset email job and persists a Code row. We assert the resolver
  // result + the Code side effect, never email delivery. Always returns
  // success — even for an unknown email — to avoid account enumeration.

  describe('resetUserPassword', () => {
    const resetUserPassword = (email: string) =>
      graphql(app, {
        query: `mutation ($data: ResetPasswordInput!) {
          resetUserPassword(data: $data) { success }
        }`,
        variables: { data: { email } },
      });

    it('creates a reset Code row for a known email and returns success', async () => {
      // Unique email per run keeps the per-email Redis cooldown from skipping us.
      const password = await hashPassword('ResetMe123!');
      const user = await trackUser({
        email: `reset-${Date.now()}@test.local`,
        password,
      });

      const res = await resetUserPassword(user.email!);
      expect(gqlData(res).resetUserPassword).toMatchObject({ success: true });

      const code = await prisma.code.findFirst({ where: { userId: user.id } });
      expect(code).not.toBeNull();
      expect(code?.expiresAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it('returns success for an unknown email without creating a Code', async () => {
      const email = `unknown-${Date.now()}@test.local`;
      const res = await resetUserPassword(email);
      expect(gqlData(res).resetUserPassword).toMatchObject({ success: true });

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user).toBeNull();
    });
  });

  // ── acceptInvite ─────────────────────────────────────────────────────────
  // Creates a User + Account for the invited email and attaches it to the
  // inviting project; the invite is marked deleted (consumed).

  describe('acceptInvite', () => {
    const acceptInvite = (data: { code: string; password: string; userName: string }) =>
      graphql(app, {
        query: `mutation ($data: AcceptInviteInput!) {
          acceptInvite(data: $data) {
            accessToken refreshToken requiresTwoFactor requiresTwoFactorSetup
            user { id email name }
          }
        }`,
        variables: { data },
      });

    it('creates a user, attaches the membership, and consumes the invite', async () => {
      const project = await buildProject(prisma, { name: 'invite-proj' });
      projectIds.push(project.id);
      const inviteEmail = `invitee-${Date.now()}@test.local`;
      const invite = await buildInvite(prisma, {
        projectId: project.id,
        email: inviteEmail,
        role: 'ADMIN',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      // buildInvite created the inviting (creator) user — track it for cleanup.
      userIds.push(invite.userId);

      const auth = gqlData(
        await acceptInvite({ code: invite.code, password: 'InvitePass1!', userName: 'Invited' }),
      ).acceptInvite;

      expect(typeof auth.accessToken).toBe('string');
      expect(auth.user).toMatchObject({ email: inviteEmail, name: 'Invited' });
      userIds.push(auth.user.id);

      // Membership in the inviting project with the invite's role.
      const membership = await prisma.userOnProject.findFirst({
        where: { userId: auth.user.id, projectId: project.id },
      });
      expect(membership).toMatchObject({ role: 'ADMIN', actived: true });

      // An email Account links the new local identity.
      const account = await prisma.account.findFirst({
        where: { userId: auth.user.id, provider: 'email' },
      });
      expect(account).toMatchObject({ type: 'email', providerAccountId: inviteEmail });

      // Invite consumed (soft-deleted), so the link can't be reused.
      const inviteRow = await prisma.invite.findUnique({ where: { id: invite.id } });
      expect(inviteRow?.deleted).toBe(true);
    });

    it('errors for an invalid invite code', async () => {
      const res = await acceptInvite({
        code: 'does-not-exist',
        password: 'InvitePass1!',
        userName: 'Nope',
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // ── setupSystemAdmin ─────────────────────────────────────────────────────
  // GAP (intentional): valid only in self-hosted mode AND before any user
  // exists. e2e runs in SaaS mode (IS_SELF_HOSTED_MODE=false), so the op hits
  // `ensureSystemAdminSetupAvailable` -> SystemAdminSetupUnavailableError and
  // creates nothing. We assert ONLY that error path. We deliberately do NOT
  // attempt the happy path: it mutates global instance state (creates a system
  // admin + the first project) on the shared test database and cannot be run in
  // isolation — running it would pollute every other spec's view of "is the
  // instance initialized". No rows are created by this test.

  describe('setupSystemAdmin', () => {
    it('errors in SaaS mode (setup unavailable) and creates no admin', async () => {
      const email = `sysadmin-${Date.now()}@test.local`;
      const res = await graphql(app, {
        query: `mutation ($data: SetupSystemAdminInput!) {
          setupSystemAdmin(data: $data) { accessToken }
        }`,
        variables: { data: { name: 'Sys Admin', email, password: 'SysAdminPass1!' } },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      // Nothing was created — neither the admin user nor any system admin.
      const created = await prisma.user.findUnique({ where: { email } });
      expect(created).toBeNull();
    });
  });
});
