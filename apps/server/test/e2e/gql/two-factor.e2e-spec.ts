import { INestApplication } from '@nestjs/common';
import { authenticator } from 'otplib';
import { PrismaService } from 'nestjs-prisma';

import { TwoFactorService } from '@/auth/two-factor.service';

import { graphql, gqlData, signToken } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildUser } from '../factories';
import { teardownProject } from './_support';

/**
 * Functional e2e for the `two-factor` GraphQL resolver. Most ops are self-scoped
 * (authenticated by "are you logged in", no project permission guard), so —
 * like users.e2e — each test builds a fresh user, signs a JWT, runs the op, and
 * asserts the effect in the DB (User.twoFactorEnabled / twoFactorSecret and the
 * hashed rows in TwoFactorRecoveryCode).
 *
 * TOTP: the service generates secrets with otplib's `authenticator` and sets
 * `authenticator.options = { window: 1 }` at module load. We import the SAME
 * `authenticator` here, so `authenticator.generate(secret)` produces a code the
 * server accepts via `authenticator.check`.
 *
 * Challenge variants (`startTwoFactorSetupWithChallenge`,
 * `confirmTwoFactorSetupWithChallenge`, `verifyTwoFactor`) take short-lived
 * signed challenge tokens that the LOGIN flow normally mints. Rather than drive
 * a full self-hosted-enforced login, we mint them directly via the service's
 * own (public) `signChallengeToken(userId, purpose)` — the exact tokens login
 * would issue — so the resolver path is exercised end to end.
 *
 * Mode note: e2e runs in SaaS mode (apps/server/.env has IS_SELF_HOSTED_MODE
 * =false), so `isTwoFactorAvailableForUser` is always true (no license needed)
 * and `isInstanceEnforcing` is always false (so `disableTwoFactor` is allowed).
 */
describe('GraphQL two-factor (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let twoFactorService: TwoFactorService;
  const userIds: string[] = [];
  const projectIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    twoFactorService = app.get(TwoFactorService);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      for (const projectId of projectIds) {
        await teardownProject(prisma, projectId);
      }
      if (userIds.length) {
        // Recovery codes and refresh tokens FK to User, so clear them first.
        await prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
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

  const startSetup = (token: string) =>
    graphql(app, {
      token,
      query: `mutation {
        startTwoFactorSetup { secret otpauthUri qrDataUri }
      }`,
    });

  const confirmSetup = (token: string, secret: string, code: string) =>
    graphql(app, {
      token,
      query: `mutation ($data: ConfirmTwoFactorSetupInput!) {
        confirmTwoFactorSetup(data: $data) { recoveryCodes auth { accessToken requiresTwoFactor requiresTwoFactorSetup } }
      }`,
      variables: { data: { secret, code } },
    });

  /** Run the full enable flow for a fresh user; returns user, token, recovery codes, secret. */
  const enableTwoFactor = async () => {
    const { user, token } = await authUser();
    const setup = gqlData(await startSetup(token)).startTwoFactorSetup;
    const code = authenticator.generate(setup.secret);
    const result = gqlData(await confirmSetup(token, setup.secret, code)).confirmTwoFactorSetup;
    return { user, token, secret: setup.secret, recoveryCodes: result.recoveryCodes as string[] };
  };

  describe('startTwoFactorSetup', () => {
    it('returns a secret + otpauth uri + QR data uri, persisting nothing yet', async () => {
      const { user, token } = await authUser();
      const payload = gqlData(await startSetup(token)).startTwoFactorSetup;

      expect(typeof payload.secret).toBe('string');
      expect(payload.secret.length).toBeGreaterThan(0);
      expect(payload.otpauthUri).toContain('otpauth://totp/');
      expect(payload.otpauthUri).toContain(`secret=${payload.secret}`);
      expect(payload.qrDataUri).toMatch(/^data:image\/png;base64,/);

      // Setup is stateless: nothing is written until confirm.
      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.twoFactorEnabled).toBe(false);
      expect(row?.twoFactorSecret).toBeNull();
    });

    it('errors without a token', async () => {
      const res = await startSetup('');
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });

    it('errors when 2FA is already enabled', async () => {
      const { token } = await enableTwoFactor();
      const res = await startSetup(token);
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('confirmTwoFactorSetup', () => {
    it('enables 2FA, stores an encrypted secret + 10 hashed recovery codes', async () => {
      const { user, token } = await authUser();
      const setup = gqlData(await startSetup(token)).startTwoFactorSetup;
      const code = authenticator.generate(setup.secret);

      const result = gqlData(await confirmSetup(token, setup.secret, code)).confirmTwoFactorSetup;
      expect(result.recoveryCodes).toHaveLength(10);
      // Re-login payload is returned so the SPA stays authenticated.
      expect(result.auth).toMatchObject({
        requiresTwoFactor: false,
        requiresTwoFactorSetup: false,
      });
      expect(typeof result.auth.accessToken).toBe('string');

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.twoFactorEnabled).toBe(true);
      expect(row?.twoFactorSecret).toBeTruthy();
      // The stored secret is encrypted, not the cleartext secret.
      expect(row?.twoFactorSecret).not.toBe(setup.secret);
      expect(row?.twoFactorEnabledAt).toBeTruthy();

      const codes = await prisma.twoFactorRecoveryCode.findMany({ where: { userId: user.id } });
      expect(codes).toHaveLength(10);
      // Stored hashed, not cleartext.
      for (const stored of codes) {
        expect(result.recoveryCodes).not.toContain(stored.hashedCode);
        expect(stored.usedAt).toBeNull();
      }
    });

    it('errors for a wrong code and leaves 2FA disabled', async () => {
      const { user, token } = await authUser();
      const setup = gqlData(await startSetup(token)).startTwoFactorSetup;

      const res = await confirmSetup(token, setup.secret, '000000');
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.twoFactorEnabled).toBe(false);
      expect(row?.twoFactorSecret).toBeNull();
      const codes = await prisma.twoFactorRecoveryCode.count({ where: { userId: user.id } });
      expect(codes).toBe(0);
    });

    it('errors when called for an already-enabled user', async () => {
      const { token, secret } = await enableTwoFactor();
      const code = authenticator.generate(secret);
      const res = await confirmSetup(token, secret, code);
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('disableTwoFactor', () => {
    const disable = (token: string, code: string, isRecoveryCode = false) =>
      graphql(app, {
        token,
        query: 'mutation ($data: TwoFactorStepUpInput!) { disableTwoFactor(data: $data) }',
        variables: { data: { code, isRecoveryCode } },
      });

    it('disables 2FA with a valid TOTP and clears secret + recovery codes', async () => {
      const { user, token, secret } = await enableTwoFactor();

      const code = authenticator.generate(secret);
      expect(gqlData(await disable(token, code)).disableTwoFactor).toBe(true);

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.twoFactorEnabled).toBe(false);
      expect(row?.twoFactorSecret).toBeNull();
      expect(row?.twoFactorEnabledAt).toBeNull();
      const codes = await prisma.twoFactorRecoveryCode.count({ where: { userId: user.id } });
      expect(codes).toBe(0);
    });

    it('disables 2FA with a valid recovery code', async () => {
      const { user, token, recoveryCodes } = await enableTwoFactor();

      expect(gqlData(await disable(token, recoveryCodes[0], true)).disableTwoFactor).toBe(true);

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.twoFactorEnabled).toBe(false);
      expect(row?.twoFactorSecret).toBeNull();
    });

    it('errors for a wrong code and leaves 2FA enabled', async () => {
      const { user, token } = await enableTwoFactor();

      const res = await disable(token, '000000');
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.twoFactorEnabled).toBe(true);
      expect(row?.twoFactorSecret).toBeTruthy();
    });

    it('errors when 2FA is not enabled', async () => {
      const { token } = await authUser();
      const res = await disable(token, '000000');
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('regenerateRecoveryCodes', () => {
    const regenerate = (token: string, code: string, isRecoveryCode = false) =>
      graphql(app, {
        token,
        query: `mutation ($data: TwoFactorStepUpInput!) {
          regenerateRecoveryCodes(data: $data) { recoveryCodes }
        }`,
        variables: { data: { code, isRecoveryCode } },
      });

    it('replaces the recovery codes with a fresh set of 10 (hashed in DB)', async () => {
      const { user, secret, token, recoveryCodes: original } = await enableTwoFactor();
      const before = await prisma.twoFactorRecoveryCode.findMany({ where: { userId: user.id } });

      const code = authenticator.generate(secret);
      const result = gqlData(await regenerate(token, code)).regenerateRecoveryCodes;
      expect(result.recoveryCodes).toHaveLength(10);
      // A different set than the original cleartext codes.
      expect(result.recoveryCodes).not.toEqual(original);

      const after = await prisma.twoFactorRecoveryCode.findMany({ where: { userId: user.id } });
      expect(after).toHaveLength(10);
      // Old hashed rows are deleted and new ones created.
      const beforeHashes = new Set(before.map((c) => c.hashedCode));
      for (const row of after) {
        expect(beforeHashes.has(row.hashedCode)).toBe(false);
        expect(row.usedAt).toBeNull();
      }
    });

    it('errors for a wrong code and leaves recovery codes unchanged', async () => {
      const { user, token } = await enableTwoFactor();
      const before = await prisma.twoFactorRecoveryCode.findMany({ where: { userId: user.id } });

      const res = await regenerate(token, '000000');
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const after = await prisma.twoFactorRecoveryCode.findMany({ where: { userId: user.id } });
      expect(after.map((c) => c.hashedCode).sort()).toEqual(before.map((c) => c.hashedCode).sort());
    });

    it('errors when 2FA is not enabled', async () => {
      const { token } = await authUser();
      const res = await regenerate(token, '000000');
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  // -- Challenge variants ----------------------------------------------------
  // These are @Public() mutations driven by short-lived signed challenge tokens
  // that login mints. We mint them directly via TwoFactorService.signChallengeToken
  // (the exact tokens login would emit) to exercise the resolver paths.

  describe('startTwoFactorSetupWithChallenge', () => {
    const startWithChallenge = (challengeToken: string) =>
      graphql(app, {
        query: `mutation ($challengeToken: String!) {
          startTwoFactorSetupWithChallenge(challengeToken: $challengeToken) { secret otpauthUri qrDataUri }
        }`,
        variables: { challengeToken },
      });

    it('returns a setup payload for a valid mfa-setup-required challenge', async () => {
      const { user } = await authUser();
      const challenge = twoFactorService.signChallengeToken(user.id, 'mfa-setup-required');

      const payload = gqlData(await startWithChallenge(challenge)).startTwoFactorSetupWithChallenge;
      expect(typeof payload.secret).toBe('string');
      expect(payload.secret.length).toBeGreaterThan(0);
      expect(payload.otpauthUri).toContain('otpauth://totp/');
      expect(payload.qrDataUri).toMatch(/^data:image\/png;base64,/);
    });

    it('errors for an invalid challenge token', async () => {
      const res = await startWithChallenge('not-a-valid-token');
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });

    it('errors when the challenge has the wrong purpose', async () => {
      const { user } = await authUser();
      const wrongPurpose = twoFactorService.signChallengeToken(user.id, 'mfa-verify');
      const res = await startWithChallenge(wrongPurpose);
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('confirmTwoFactorSetupWithChallenge', () => {
    const confirmWithChallenge = (challengeToken: string, secret: string, code: string) =>
      graphql(app, {
        query: `mutation ($data: ConfirmTwoFactorSetupInput!) {
          confirmTwoFactorSetupWithChallenge(data: $data) {
            recoveryCodes auth { accessToken requiresTwoFactor requiresTwoFactorSetup }
          }
        }`,
        variables: { data: { ...(challengeToken ? { challengeToken } : {}), secret, code } },
      });

    it('enables 2FA and issues login tokens for a valid challenge', async () => {
      const { user } = await authUser();
      const challenge = twoFactorService.signChallengeToken(user.id, 'mfa-setup-required');
      const start = gqlData(
        await graphql(app, {
          query: `mutation ($challengeToken: String!) {
            startTwoFactorSetupWithChallenge(challengeToken: $challengeToken) { secret }
          }`,
          variables: { challengeToken: challenge },
        }),
      ).startTwoFactorSetupWithChallenge;
      const code = authenticator.generate(start.secret);

      const result = gqlData(
        await confirmWithChallenge(challenge, start.secret, code),
      ).confirmTwoFactorSetupWithChallenge;
      expect(result.recoveryCodes).toHaveLength(10);
      expect(typeof result.auth.accessToken).toBe('string');
      expect(result.auth).toMatchObject({
        requiresTwoFactor: false,
        requiresTwoFactorSetup: false,
      });

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.twoFactorEnabled).toBe(true);
      expect(row?.twoFactorSecret).toBeTruthy();
      const codes = await prisma.twoFactorRecoveryCode.count({ where: { userId: user.id } });
      expect(codes).toBe(10);
    });

    it('errors when challengeToken is missing', async () => {
      const { user } = await authUser();
      const challenge = twoFactorService.signChallengeToken(user.id, 'mfa-setup-required');
      const start = gqlData(
        await graphql(app, {
          query: `mutation ($challengeToken: String!) {
            startTwoFactorSetupWithChallenge(challengeToken: $challengeToken) { secret }
          }`,
          variables: { challengeToken: challenge },
        }),
      ).startTwoFactorSetupWithChallenge;
      const code = authenticator.generate(start.secret);

      const res = await confirmWithChallenge('', start.secret, code);
      expect(res.body.errors?.length).toBeGreaterThan(0);

      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.twoFactorEnabled).toBe(false);
    });

    it('errors for a wrong code', async () => {
      const { user } = await authUser();
      const challenge = twoFactorService.signChallengeToken(user.id, 'mfa-setup-required');
      const start = gqlData(
        await graphql(app, {
          query: `mutation ($challengeToken: String!) {
            startTwoFactorSetupWithChallenge(challengeToken: $challengeToken) { secret }
          }`,
          variables: { challengeToken: challenge },
        }),
      ).startTwoFactorSetupWithChallenge;

      const res = await confirmWithChallenge(challenge, start.secret, '000000');
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('verifyTwoFactor', () => {
    const verify = (challengeToken: string, code: string, isRecoveryCode = false) =>
      graphql(app, {
        query: `mutation ($data: VerifyTwoFactorInput!) {
          verifyTwoFactor(data: $data) { accessToken refreshToken requiresTwoFactor requiresTwoFactorSetup }
        }`,
        variables: { data: { challengeToken, code, isRecoveryCode } },
      });

    it('issues login tokens for a valid TOTP against an mfa-verify challenge', async () => {
      const { user, secret } = await enableTwoFactor();
      const challenge = twoFactorService.signChallengeToken(user.id, 'mfa-verify');
      const code = authenticator.generate(secret);

      const auth = gqlData(await verify(challenge, code)).verifyTwoFactor;
      expect(typeof auth.accessToken).toBe('string');
      expect(typeof auth.refreshToken).toBe('string');
      expect(auth).toMatchObject({ requiresTwoFactor: false, requiresTwoFactorSetup: false });
    });

    it('accepts a valid recovery code and marks it used', async () => {
      const { user, recoveryCodes } = await enableTwoFactor();
      const challenge = twoFactorService.signChallengeToken(user.id, 'mfa-verify');

      const auth = gqlData(await verify(challenge, recoveryCodes[0], true)).verifyTwoFactor;
      expect(typeof auth.accessToken).toBe('string');

      // The consumed recovery code is now marked used; the rest remain unused.
      const used = await prisma.twoFactorRecoveryCode.count({
        where: { userId: user.id, usedAt: { not: null } },
      });
      expect(used).toBe(1);
    });

    it('errors for a wrong code', async () => {
      const { user } = await enableTwoFactor();
      const challenge = twoFactorService.signChallengeToken(user.id, 'mfa-verify');

      const res = await verify(challenge, '000000');
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });

    it('errors for an invalid challenge token', async () => {
      const { secret } = await enableTwoFactor();
      const code = authenticator.generate(secret);
      const res = await verify('not-a-valid-token', code);
      expect(res.body.errors?.length).toBeGreaterThan(0);
    });
  });
});
