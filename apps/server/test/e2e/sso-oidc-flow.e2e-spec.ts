import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { PrismaService } from 'nestjs-prisma';

import { SsoOidcService } from '@/sso/sso-oidc.service';
import { ACCESS_TOKEN_COOKIE, SSO_TX_COOKIE } from '@/utils/cookie';
import { buildMembership, buildProject, buildSubscription, buildUser } from './factories';
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
  member: `member-${TAG}@acme.com`,
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
        defaultRole: 'ADMIN',
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

  describe('callback', () => {
    it('JIT-provisions a brand-new user into the project with the default role', async () => {
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
      expect(membership?.role).toBe('ADMIN'); // provider.defaultRole
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

    it('rejects when the email domain is not in the allow-list', async () => {
      const gated = await prisma.projectSSOIdentityProvider.create({
        data: {
          projectId,
          type: 'OIDC',
          name: 'Domain-gated',
          status: 'active',
          defaultRole: 'ADMIN',
          allowedDomains: ['acme.com'],
          issuer: 'https://idp.test',
          clientId: 'c',
          clientSecret: 's',
        },
      });
      const email = EMAILS.intruder;
      jitEmails.push(email);
      currentClaims = { sub: 'sub-intruder', email, email_verified: true };

      const tx = jwt.sign({
        tokenType: 'sso-tx',
        providerId: gated.id,
        state: 'state-1',
        nonce: 'nonce-1',
        codeVerifier: 'verifier-1',
      });
      const res = await callback(tx);
      expect(hasCookie(res, ACCESS_TOKEN_COOKIE)).toBe(false);
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();

      await prisma.projectSSOIdentityProvider.delete({ where: { id: gated.id } });
    });

    it('rejects when the IdP reports the email as unverified', async () => {
      const email = EMAILS.unverified;
      jitEmails.push(email);
      currentClaims = { sub: 'sub-unverified', email, email_verified: false };

      const res = await callback(signTx());
      expect(hasCookie(res, ACCESS_TOKEN_COOKIE)).toBe(false);
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
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
