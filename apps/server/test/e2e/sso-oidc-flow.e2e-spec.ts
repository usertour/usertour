import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { PrismaService } from 'nestjs-prisma';

import { SsoOidcService } from '@/sso/sso-oidc.service';
import { ACCESS_TOKEN_COOKIE, SSO_TX_COOKIE } from '@/utils/cookie';
import {
  buildEnvironment,
  buildInvite,
  buildMembership,
  buildProject,
  buildSubscription,
  buildUser,
} from './factories';
import { teardownProject } from './gql/_support';

/**
 * HTTP e2e for the per-project OIDC login flow (initiate + callback). The
 * external IdP handshake (`SsoOidcService`) is stubbed so we can drive
 * controlled claims; everything else is real — the controller, the tx-cookie
 * round-trip, `AuthService.ssoValidate` (safe-linking / JIT / domain gate), the
 * seat check, and the issued auth cookie.
 *
 * Mode: the entitlement gate resolves via subscription only in SaaS mode, and
 * config.ts reads IS_SELF_HOSTED_MODE at import time — force it before the
 * AppModule is required (lazily, in beforeAll).
 */
const prevSelfHosted = process.env.IS_SELF_HOSTED_MODE;
process.env.IS_SELF_HOSTED_MODE = 'false';

// Run-scoped unique emails so re-runs (and any prior crashed teardown) never
// collide on User.email's unique constraint.
const TAG = Date.now().toString(36);
const EMAILS = {
  jit: `jit-${TAG}@acme.com`,
  jitOff: `jit-off-${TAG}@acme.com`,
  jitInvited: `jit-invited-${TAG}@acme.com`,
  member: `member-${TAG}@acme.com`,
  removed: `removed-${TAG}@acme.com`,
  rejoiner: `rejoiner-${TAG}@acme.com`,
  invited: `invited-${TAG}@acme.com`,
  outsider: `outsider-${TAG}@acme.com`,
  intruder: `intruder-${TAG}@evil.com`,
  unverified: `unverified-${TAG}@acme.com`,
  other: `x-${TAG}@acme.com`,
};

// Mutable claims the stubbed token exchange returns — set per test.
let currentClaims: Record<string, unknown>;
const oidcMock = {
  createAuthRequest: jest.fn(async () => ({
    url: 'https://idp.example/authorize?req=1',
    state: 'state-1',
    nonce: 'nonce-1',
    codeVerifier: 'verifier-1',
  })),
  exchangeCallback: jest.fn(async () => currentClaims),
  buildCallbackUrl: jest.fn(() => 'http://test/api/auth/sso/callback'),
};

const hasCookie = (res: request.Response, name: string): boolean =>
  ((res.headers['set-cookie'] as unknown as string[]) ?? []).some((c) => c.startsWith(`${name}=`));

describe('SSO OIDC login flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let projectId: string;
  let providerId: string; // active provider, no domain restriction
  const userIds: string[] = [];
  const jitEmails: string[] = [];

  const signTx = (over: Record<string, unknown> = {}): string =>
    jwt.sign({
      tokenType: 'sso-tx',
      providerId,
      state: 'state-1',
      nonce: 'nonce-1',
      codeVerifier: 'verifier-1',
      ...over,
    });

  // Single fixed callback; the provider is resolved from the tx cookie.
  const callback = (tx: string) =>
    request(app.getHttpServer())
      .get('/api/auth/sso/callback')
      .query({ code: 'auth-code', state: 'state-1' })
      .set('Cookie', `${SSO_TX_COOKIE}=${tx}`);

  beforeAll(async () => {
    // Lazily require create-test-app so config.ts is evaluated AFTER the mode
    // flag is set above. The stubbed IdP is the only override; cookie parsing is
    // part of the shared pipeline (configureApp), so the canonical boot suffices.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createTestApp } = require('./create-test-app') as typeof import('./create-test-app');
    app = await createTestApp((builder) =>
      builder.overrideProvider(SsoOidcService).useValue(oidcMock),
    );

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    const project = await buildProject(prisma, { name: 'sso-flow' });
    projectId = project.id;
    await buildSubscription(prisma, { projectId }); // BUSINESS → ssoOidc: true

    const provider = await prisma.projectSSOIdentityProvider.create({
      data: {
        projectId,
        type: 'OIDC',
        name: 'Okta',
        status: 'active',
        issuer: 'https://idp.test',
        clientId: 'c',
        clientSecret: 's',
      },
    });
    providerId = provider.id;
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      const jitUsers = await prisma.user.findMany({
        where: { email: { in: jitEmails } },
        select: { id: true },
      });
      const cleanupIds = [...userIds, ...jitUsers.map((u) => u.id)];
      if (cleanupIds.length) {
        // Successful logins issue refresh tokens — remove them before the users.
        await prisma.refreshToken.deleteMany({ where: { userId: { in: cleanupIds } } });
        await prisma.account.deleteMany({ where: { userId: { in: cleanupIds } } });
        await prisma.userOnProject.deleteMany({ where: { userId: { in: cleanupIds } } });
      }
      await teardownProject(prisma, projectId);
      if (cleanupIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: cleanupIds } } });
      }
    }
    await app?.close();
    process.env.IS_SELF_HOSTED_MODE = prevSelfHosted ?? '';
  });

  describe('initiate', () => {
    it('redirects to the IdP and sets the tx cookie', async () => {
      const res = await request(app.getHttpServer()).get(`/api/auth/sso/${providerId}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://idp.example/authorize?req=1');
      expect(hasCookie(res, SSO_TX_COOKIE)).toBe(true);
    });

    it('does not start SSO for an unknown provider', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/sso/does-not-exist');
      expect(hasCookie(res, SSO_TX_COOKIE)).toBe(false);
      expect(res.headers.location).not.toBe('https://idp.example/authorize?req=1');
    });
  });

  // Toggle the project's auto-provision policy (one settings row per project).
  const setAutoProvision = (autoProvision: boolean, allowedDomains: string[] = []) =>
    prisma.projectSsoSettings.upsert({
      where: { projectId },
      create: { projectId, autoProvision, allowedDomains },
      update: { autoProvision, allowedDomains },
    });

  describe('callback', () => {
    it('auto-provisions a brand-new user when auto-provision is on (default role)', async () => {
      await setAutoProvision(true);
      const email = EMAILS.jit;
      jitEmails.push(email);
      currentClaims = { sub: 'sub-jit-1', email, email_verified: true, name: 'New User' };

      const res = await callback(signTx());
      expect(res.status).toBe(302);
      expect(hasCookie(res, ACCESS_TOKEN_COOKIE)).toBe(true);

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user).not.toBeNull();
      const membership = await prisma.userOnProject.findFirst({
        where: { projectId, userId: user!.id },
      });
      expect(membership?.role).toBe('ADMIN'); // settings.defaultRole
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: `oidc:${providerId}`,
            providerAccountId: 'sub-jit-1',
          },
        },
      });
      expect(account?.userId).toBe(user!.id);
    });

    it('rejects a brand-new user when auto-provision is off (invite required)', async () => {
      await setAutoProvision(false);
      const email = EMAILS.jitOff;
      jitEmails.push(email);
      currentClaims = { sub: 'sub-jit-off', email, email_verified: true };

      const res = await callback(signTx());
      expect(hasCookie(res, ACCESS_TOKEN_COOKIE)).toBe(false);
      // No account created — SSO grants no new access without an invite.
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
      // Friendly redirect, not a 500: access-denied routes back to the SSO entry.
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain(`/auth/sso/${projectId}`);
      expect(res.headers.location).toContain('error=access_denied');
    });

    it('JIT-provisions a brand-new invited user with the invite role (consumes the invite)', async () => {
      const email = EMAILS.jitInvited;
      jitEmails.push(email);
      // Dormant machinery: no API writes Invite.allowedEnvironmentIds today
      // (held back until the member-permission design lands), but rows carrying
      // it must still ride the accept funnel correctly — a LIVE environment id
      // is copied onto the membership, never widened to all environments.
      const scopedEnv = await buildEnvironment(prisma, { projectId });
      const invite = await buildInvite(prisma, {
        projectId,
        email,
        role: 'VIEWER' as never, // differs from the project default (ADMIN)
        allowedEnvironmentIds: [scopedEnv.id], // env-restricted invite
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      userIds.push(invite.userId);
      currentClaims = { sub: 'sub-jit-invited', email, email_verified: true, name: 'Invited New' };

      const res = await callback(signTx());
      expect(res.status).toBe(302);
      expect(hasCookie(res, ACCESS_TOKEN_COOKIE)).toBe(true);

      const user = await prisma.user.findUnique({ where: { email } });
      const membership = await prisma.userOnProject.findFirst({
        where: { projectId, userId: user!.id },
      });
      expect(membership?.role).toBe('VIEWER'); // invite role wins over the default
      // The invite's environment restriction must carry onto the membership —
      // an env-scoped invite accepted via SSO must NOT grant all environments.
      expect(membership?.allowedEnvironmentIds).toEqual([scopedEnv.id]);
      const inviteRow = await prisma.invite.findUnique({ where: { id: invite.id } });
      expect(inviteRow?.deleted).toBe(true);
    });

    it('links an existing member without creating a duplicate user', async () => {
      const member = await buildUser(prisma, { email: EMAILS.member });
      userIds.push(member.id);
      await buildMembership(prisma, { userId: member.id, projectId, role: 'VIEWER' as never });
      currentClaims = { sub: 'sub-member-1', email: EMAILS.member, email_verified: true };

      const res = await callback(signTx());
      expect(res.status).toBe(302);
      expect(hasCookie(res, ACCESS_TOKEN_COOKIE)).toBe(true);

      const users = await prisma.user.findMany({ where: { email: EMAILS.member } });
      expect(users).toHaveLength(1); // linked, not duplicated
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: `oidc:${providerId}`,
            providerAccountId: 'sub-member-1',
          },
        },
      });
      expect(account?.userId).toBe(member.id);
    });

    it('rejects a previously-linked user who is no longer a member (access revoked)', async () => {
      await setAutoProvision(false);
      const removed = await buildUser(prisma, { email: EMAILS.removed });
      userIds.push(removed.id);
      // A linked identity from a prior login, but no current membership/invite —
      // being linked must NOT keep granting access.
      await prisma.account.create({
        data: {
          type: 'oauth',
          userId: removed.id,
          provider: `oidc:${providerId}`,
          providerAccountId: 'sub-removed',
        },
      });
      currentClaims = { sub: 'sub-removed', email: EMAILS.removed, email_verified: true };

      const res = await callback(signTx());
      expect(hasCookie(res, ACCESS_TOKEN_COOKIE)).toBe(false);
      expect(res.headers.location).toContain('error=access_denied');
      const membership = await prisma.userOnProject.findFirst({
        where: { projectId, userId: removed.id },
      });
      expect(membership).toBeNull();
    });

    it('auto-provisions an existing non-member when auto-provision is on', async () => {
      // Same case as the revoked user above, but the project opted into
      // auto-provision — so they are re-added with the default role.
      await prisma.projectSsoSettings.upsert({
        where: { projectId },
        create: { projectId, autoProvision: true, defaultRole: 'VIEWER', allowedDomains: [] },
        update: { autoProvision: true, defaultRole: 'VIEWER', allowedDomains: [] },
      });
      const rejoiner = await buildUser(prisma, { email: EMAILS.rejoiner });
      userIds.push(rejoiner.id);
      await prisma.account.create({
        data: {
          type: 'oauth',
          userId: rejoiner.id,
          provider: `oidc:${providerId}`,
          providerAccountId: 'sub-rejoin',
        },
      });
      currentClaims = { sub: 'sub-rejoin', email: EMAILS.rejoiner, email_verified: true };

      const res = await callback(signTx());
      expect(res.status).toBe(302);
      expect(hasCookie(res, ACCESS_TOKEN_COOKIE)).toBe(true);
      const membership = await prisma.userOnProject.findFirst({
        where: { projectId, userId: rejoiner.id },
      });
      expect(membership?.role).toBe('VIEWER'); // settings.defaultRole
      // Auto-provision has no invite, so the membership is unrestricted (null) —
      // locks the null-guard: only an invite-driven SSO join carries a restriction.
      expect(membership?.allowedEnvironmentIds).toBeNull();
      // Reset so later tests keep the invite-required default.
      await setAutoProvision(false);
    });

    it('rejects an existing global user who is NOT a member (no cross-tenant takeover)', async () => {
      const outsider = await buildUser(prisma, { email: EMAILS.outsider });
      userIds.push(outsider.id);
      currentClaims = { sub: 'sub-outsider-1', email: EMAILS.outsider, email_verified: true };

      const res = await callback(signTx());
      expect(hasCookie(res, ACCESS_TOKEN_COOKIE)).toBe(false);
      const membership = await prisma.userOnProject.findFirst({
        where: { projectId, userId: outsider.id },
      });
      expect(membership).toBeNull(); // not pulled into the project
    });

    it('consumes a pending invite for an existing non-member (joins + links)', async () => {
      const invited = await buildUser(prisma, { email: EMAILS.invited });
      userIds.push(invited.id);
      // Dormant machinery (see the JIT-invite test): rows carrying an env
      // restriction must ride the accept funnel with a LIVE environment id.
      const scopedEnv = await buildEnvironment(prisma, { projectId });
      const invite = await buildInvite(prisma, {
        projectId,
        email: EMAILS.invited,
        role: 'ADMIN' as never,
        allowedEnvironmentIds: [scopedEnv.id], // env-restricted invite
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      userIds.push(invite.userId); // the invite's creator
      currentClaims = { sub: 'sub-invited-1', email: EMAILS.invited, email_verified: true };

      const res = await callback(signTx());
      expect(res.status).toBe(302);
      expect(hasCookie(res, ACCESS_TOKEN_COOKIE)).toBe(true);

      // Joined with the invite's role — no duplicate user.
      const membership = await prisma.userOnProject.findFirst({
        where: { projectId, userId: invited.id },
      });
      expect(membership?.role).toBe('ADMIN');
      // …and with the invite's environment restriction (existing-user SSO path).
      expect(membership?.allowedEnvironmentIds).toEqual([scopedEnv.id]);
      expect(await prisma.user.findMany({ where: { email: EMAILS.invited } })).toHaveLength(1);

      // Invite consumed (soft-deleted) and the SSO identity linked.
      const inviteRow = await prisma.invite.findUnique({ where: { id: invite.id } });
      expect(inviteRow?.deleted).toBe(true);
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: `oidc:${providerId}`,
            providerAccountId: 'sub-invited-1',
          },
        },
      });
      expect(account?.userId).toBe(invited.id);
    });

    it('rejects when the email domain is not in the allow-list (auto-provision on)', async () => {
      // The allow-list only gates auto-provisioning, so enable that too.
      await setAutoProvision(true, ['acme.com']);
      const email = EMAILS.intruder; // @evil.com — not in the allow-list
      jitEmails.push(email);
      currentClaims = { sub: 'sub-intruder', email, email_verified: true };

      const res = await callback(signTx());
      expect(hasCookie(res, ACCESS_TOKEN_COOKIE)).toBe(false);
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();

      // Reset so later tests trust the IdP again.
      await setAutoProvision(false, []);
    });

    it('rejects when the IdP reports the email as unverified', async () => {
      const email = EMAILS.unverified;
      jitEmails.push(email);
      currentClaims = { sub: 'sub-unverified', email, email_verified: false };

      const res = await callback(signTx());
      expect(hasCookie(res, ACCESS_TOKEN_COOKIE)).toBe(false);
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
      // A non-access-denied failure redirects to the generic sign-in error.
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/auth/signin?error=sso');
    });

    it('rejects a tx cookie referencing an unknown provider', async () => {
      currentClaims = { sub: 'sub-x', email: EMAILS.other, email_verified: true };
      const tx = jwt.sign({
        tokenType: 'sso-tx',
        providerId: 'some-unknown-id',
        state: 'state-1',
        nonce: 'nonce-1',
        codeVerifier: 'verifier-1',
      });
      const res = await callback(tx);
      expect(hasCookie(res, ACCESS_TOKEN_COOKIE)).toBe(false);
    });
  });
});
