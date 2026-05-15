import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import { authenticator } from 'otplib';
import {
  FeatureRequiresLicenseError,
  InvalidRecoveryCodeError,
  InvalidTwoFactorChallengeError,
  InvalidTwoFactorCodeError,
  TooManyTwoFactorAttemptsError,
  TwoFactorAlreadyEnabledError,
  TwoFactorEnforcedDisableNotAllowedError,
  TwoFactorNotEnabledError,
} from '@/common/errors';
import { LicenseService } from '@/license/license.service';
import { EncryptionService } from '@/shared/encryption.service';
import { RedisService } from '@/shared/redis.service';
import { PasswordService } from './password.service';
import { TwoFactorService } from './two-factor.service';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,fake'),
}));

const buildUser = (overrides: Partial<any> = {}) => ({
  id: 'user-1',
  email: 'alice@example.com',
  twoFactorEnabled: false,
  twoFactorSecret: null as string | null,
  ...overrides,
});

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let prisma: any;
  let jwt: jest.Mocked<JwtService>;
  let config: { get: jest.Mock };
  let encryption: jest.Mocked<EncryptionService>;
  let passwords: jest.Mocked<PasswordService>;
  let redis: any;
  let license: jest.Mocked<LicenseService>;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      twoFactorRecoveryCode: {
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      refreshToken: { updateMany: jest.fn() },
      instanceSetting: { findUnique: jest.fn() },
      userOnProject: { findMany: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

    jwt = { sign: jest.fn(), verify: jest.fn() } as any;

    // Default config: SaaS mode (isSelfHostedMode=false), JWT secret stable
    config = {
      get: jest.fn((key: string) => {
        if (key === 'globalConfig.isSelfHostedMode') return false;
        if (key === 'auth.jwt.secret') return 'test-secret';
        if (key === 'app.name') return 'TestApp';
        return undefined;
      }),
    };

    encryption = {
      encrypt: jest.fn((s: string) => `enc:${s}`),
      decrypt: jest.fn((s: string | null) => (s ? s.replace(/^enc:/, '') : null)),
    } as any;

    passwords = {
      hashPassword: jest.fn(async (s: string) => `hashed:${s}`),
      validatePassword: jest.fn(
        async (input: string, stored: string) => stored === `hashed:${input}`,
      ),
    } as any;

    redis = {
      get: jest.fn().mockResolvedValue(null),
      incrWithExpire: jest.fn().mockResolvedValue(1),
      del: jest.fn(),
    };

    license = {
      hasFeature: jest.fn().mockResolvedValue(false),
      getLicensePayload: jest.fn().mockResolvedValue(null),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: EncryptionService, useValue: encryption },
        { provide: PasswordService, useValue: passwords },
        { provide: RedisService, useValue: redis },
        { provide: LicenseService, useValue: license },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
  });

  // ===========================================================================
  // verifyChallenge — challenge token is NOT consumed on failure
  // (regression for the bug where one mistyped TOTP made the whole session
  // unusable, blocking the recovery-code fallback)
  // ===========================================================================

  describe('verifyChallenge — challenge token re-usability', () => {
    const challengeToken = 'jwt.verify.payload';
    const goodSecret = 'JBSWY3DPEHPK3PXP';

    beforeEach(() => {
      jwt.verify.mockReturnValue({ sub: 'user-1', purpose: 'mfa-verify', jti: 'jti-1' } as any);
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ twoFactorEnabled: true, twoFactorSecret: `enc:${goodSecret}` }),
      );
    });

    it('lets the user retry with a recovery code after a wrong TOTP', async () => {
      jest.spyOn(authenticator, 'check').mockReturnValue(false);
      await expect(service.verifyChallenge(challengeToken, '000000', false)).rejects.toBeInstanceOf(
        InvalidTwoFactorCodeError,
      );

      // Same challenge token, switch to recovery code path → should NOT
      // fail with InvalidTwoFactorChallengeError (i.e. the jti must not
      // have been single-use-consumed by the previous failed attempt).
      // consumeRecoveryCode lowercases the input before compare, so the
      // hashed-code mock uses the lowercase form.
      const recoveryRow = { id: 'rec-1', hashedCode: 'hashed:abc123' };
      prisma.twoFactorRecoveryCode.findMany.mockResolvedValue([recoveryRow]);

      const user = await service.verifyChallenge(challengeToken, 'abc123', true);
      expect(user.id).toBe('user-1');
      expect(prisma.twoFactorRecoveryCode.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-1', usedAt: null },
          data: expect.any(Object),
        }),
      );
    });

    it('lets the user retry with a corrected TOTP after a typo', async () => {
      const totpSpy = jest.spyOn(authenticator, 'check');
      totpSpy.mockReturnValueOnce(false).mockReturnValueOnce(true);

      await expect(service.verifyChallenge(challengeToken, '000000', false)).rejects.toBeInstanceOf(
        InvalidTwoFactorCodeError,
      );
      const user = await service.verifyChallenge(challengeToken, '123456', false);
      expect(user.id).toBe('user-1');
    });

    it('rejects with InvalidTwoFactorChallengeError on JWT verify failure', async () => {
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('jwt expired');
      });
      await expect(service.verifyChallenge(challengeToken, '123456', false)).rejects.toBeInstanceOf(
        InvalidTwoFactorChallengeError,
      );
    });

    it('rejects challenge tokens with wrong purpose', async () => {
      jwt.verify.mockReturnValueOnce({
        sub: 'user-1',
        purpose: 'mfa-setup-required',
        jti: 'jti-1',
      } as any);
      await expect(service.verifyChallenge(challengeToken, '123456', false)).rejects.toBeInstanceOf(
        InvalidTwoFactorChallengeError,
      );
    });
  });

  // ===========================================================================
  // MFA lockout — 5 wrong attempts within 5 minutes blocks further attempts
  // ===========================================================================

  describe('verifyChallenge — MFA failure lockout', () => {
    beforeEach(() => {
      jwt.verify.mockReturnValue({ sub: 'user-1', purpose: 'mfa-verify', jti: 'jti-1' } as any);
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ twoFactorEnabled: true, twoFactorSecret: 'enc:SECRET' }),
      );
    });

    it('rejects further verify calls once the counter reaches 5', async () => {
      redis.get.mockResolvedValue('5');
      await expect(service.verifyChallenge('t', '000000', false)).rejects.toBeInstanceOf(
        TooManyTwoFactorAttemptsError,
      );
    });

    it('increments the counter on a failed verify', async () => {
      redis.get.mockResolvedValue(null);
      jest.spyOn(authenticator, 'check').mockReturnValue(false);
      await expect(service.verifyChallenge('t', '000000', false)).rejects.toBeInstanceOf(
        InvalidTwoFactorCodeError,
      );
      expect(redis.incrWithExpire).toHaveBeenCalledWith('mfa-attempts:user-1', expect.any(Number));
    });

    it('clears the counter on a successful verify', async () => {
      redis.get.mockResolvedValue('3');
      jest.spyOn(authenticator, 'check').mockReturnValue(true);
      await service.verifyChallenge('t', '123456', false);
      expect(redis.del).toHaveBeenCalledWith('mfa-attempts:user-1');
    });
  });

  // ===========================================================================
  // Recovery codes are one-time use
  // ===========================================================================

  describe('recovery code consumption', () => {
    beforeEach(() => {
      jwt.verify.mockReturnValue({ sub: 'user-1', purpose: 'mfa-verify', jti: 'jti-1' } as any);
      prisma.user.findUnique.mockResolvedValue(
        buildUser({ twoFactorEnabled: true, twoFactorSecret: 'enc:SECRET' }),
      );
    });

    it('marks a code as used on first consumption via atomic CAS', async () => {
      prisma.twoFactorRecoveryCode.findMany.mockResolvedValue([
        { id: 'rec-1', hashedCode: 'hashed:code-a' },
        { id: 'rec-2', hashedCode: 'hashed:code-b' },
      ]);

      await service.verifyChallenge('t', 'code-a', true);

      // Must use updateMany with `usedAt: null` in the WHERE clause so a
      // parallel request can't double-consume the same code.
      expect(prisma.twoFactorRecoveryCode.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-1', usedAt: null },
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        }),
      );
    });

    it('rejects when a parallel request just claimed the code (CAS loses the race)', async () => {
      // Race: findMany sees the code as unused, but updateMany returns count=0
      // because another concurrent request already flipped usedAt to non-null.
      // Both winners must NOT both report success — the loser must fail.
      prisma.twoFactorRecoveryCode.findMany.mockResolvedValue([
        { id: 'rec-1', hashedCode: 'hashed:code-a' },
      ]);
      prisma.twoFactorRecoveryCode.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.verifyChallenge('t', 'code-a', true)).rejects.toBeInstanceOf(
        InvalidRecoveryCodeError,
      );
    });

    it('rejects when no recovery code matches', async () => {
      prisma.twoFactorRecoveryCode.findMany.mockResolvedValue([
        { id: 'rec-1', hashedCode: 'hashed:other' },
      ]);

      await expect(service.verifyChallenge('t', 'wrong', true)).rejects.toBeInstanceOf(
        InvalidRecoveryCodeError,
      );
    });

    it('rejects an already-used code (findMany filters by usedAt=null)', async () => {
      // Implementation queries `where: { userId, usedAt: null }`. Simulate that
      // already-used codes are filtered out by Prisma → empty result → reject.
      prisma.twoFactorRecoveryCode.findMany.mockResolvedValue([]);
      await expect(service.verifyChallenge('t', 'code-a', true)).rejects.toBeInstanceOf(
        InvalidRecoveryCodeError,
      );
      expect(prisma.twoFactorRecoveryCode.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', usedAt: null },
      });
    });
  });

  // ===========================================================================
  // isTwoFactorAvailableForUser — license + scope-follows-membership
  // ===========================================================================

  describe('isTwoFactorAvailableForUser', () => {
    it('returns true unconditionally in SaaS mode', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'globalConfig.isSelfHostedMode' ? false : undefined,
      );

      await expect(service.isTwoFactorAvailableForUser('user-1')).resolves.toBe(true);
      expect(prisma.instanceSetting.findUnique).not.toHaveBeenCalled();
    });

    describe('self-host mode', () => {
      beforeEach(() => {
        config.get.mockImplementation((key: string) => {
          if (key === 'globalConfig.isSelfHostedMode') return true;
          if (key === 'auth.jwt.secret') return 'test-secret';
          return undefined;
        });
      });

      it('returns true when instance license covers the feature', async () => {
        prisma.instanceSetting.findUnique.mockResolvedValue({
          license: 'instance-token',
          instanceId: 'inst-1',
        });
        license.getLicensePayload.mockResolvedValue({
          scope: 'instance',
          instanceId: 'inst-1',
        } as any);
        license.hasFeature.mockResolvedValue(true);

        await expect(service.isTwoFactorAvailableForUser('user-1')).resolves.toBe(true);
        expect(prisma.userOnProject.findMany).not.toHaveBeenCalled();
      });

      it('falls back to any project license the user is a member of', async () => {
        prisma.instanceSetting.findUnique.mockResolvedValue({
          license: null,
          instanceId: 'inst-1',
        });
        prisma.userOnProject.findMany.mockResolvedValue([
          { projectId: 'proj-A', project: { license: 'proj-A-token' } },
          { projectId: 'proj-B', project: { license: 'proj-B-token' } },
        ]);
        license.getLicensePayload.mockImplementation(async (token: string) => {
          if (token === 'proj-A-token') return { scope: 'project', projectId: 'proj-A' } as any;
          if (token === 'proj-B-token') return { scope: 'project', projectId: 'proj-B' } as any;
          return null;
        });
        license.hasFeature.mockImplementation(async (token: string) => token === 'proj-B-token');

        await expect(service.isTwoFactorAvailableForUser('user-1')).resolves.toBe(true);
      });

      it('scope follows membership: another project being licensed does NOT unlock unrelated users', async () => {
        // User is only in proj-A (no license). proj-B is licensed but user is
        // NOT a member of it, so this lookup never returns proj-B.
        prisma.instanceSetting.findUnique.mockResolvedValue({
          license: null,
          instanceId: 'inst-1',
        });
        prisma.userOnProject.findMany.mockResolvedValue([
          { projectId: 'proj-A', project: { license: null } },
        ]);

        await expect(service.isTwoFactorAvailableForUser('user-1')).resolves.toBe(false);
        expect(prisma.userOnProject.findMany).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          select: expect.any(Object),
        });
      });

      it('rejects project license whose projectId does not match the membership', async () => {
        // Defensive check: a license JWT that was issued for proj-X must not
        // unlock features on proj-A even if proj-A is the membership we found.
        prisma.instanceSetting.findUnique.mockResolvedValue({
          license: null,
          instanceId: 'inst-1',
        });
        prisma.userOnProject.findMany.mockResolvedValue([
          { projectId: 'proj-A', project: { license: 'malformed-token' } },
        ]);
        license.getLicensePayload.mockResolvedValue({
          scope: 'project',
          projectId: 'proj-X',
        } as any);
        license.hasFeature.mockResolvedValue(true);

        await expect(service.isTwoFactorAvailableForUser('user-1')).resolves.toBe(false);
      });

      it('returns false when no license covers the user', async () => {
        prisma.instanceSetting.findUnique.mockResolvedValue({
          license: null,
          instanceId: 'inst-1',
        });
        prisma.userOnProject.findMany.mockResolvedValue([]);

        await expect(service.isTwoFactorAvailableForUser('user-1')).resolves.toBe(false);
      });
    });
  });

  // ===========================================================================
  // confirmSetup — state machine + transaction integrity
  // ===========================================================================

  describe('confirmSetup', () => {
    const secret = 'JBSWY3DPEHPK3PXP';

    beforeEach(() => {
      // Default: SaaS so license gate passes
      jest.spyOn(authenticator, 'check').mockReturnValue(true);
    });

    it('throws when already enabled', async () => {
      await expect(
        service.confirmSetup({ id: 'user-1', twoFactorEnabled: true }, secret, '123456'),
      ).rejects.toBeInstanceOf(TwoFactorAlreadyEnabledError);
    });

    it('throws when feature is not licensed (self-host, no license)', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'globalConfig.isSelfHostedMode' ? true : undefined,
      );
      prisma.instanceSetting.findUnique.mockResolvedValue({ license: null, instanceId: 'i' });
      prisma.userOnProject.findMany.mockResolvedValue([]);

      await expect(
        service.confirmSetup({ id: 'user-1', twoFactorEnabled: false }, secret, '123456'),
      ).rejects.toBeInstanceOf(FeatureRequiresLicenseError);
    });

    it('throws when the entered TOTP does not match the new secret', async () => {
      jest.spyOn(authenticator, 'check').mockReturnValueOnce(false);
      await expect(
        service.confirmSetup({ id: 'user-1', twoFactorEnabled: false }, secret, '000000'),
      ).rejects.toBeInstanceOf(InvalidTwoFactorCodeError);
    });

    it('persists encrypted secret + 10 recovery codes + revokes other refresh tokens', async () => {
      const result = await service.confirmSetup(
        { id: 'user-1', twoFactorEnabled: false },
        secret,
        '123456',
      );

      expect(result.recoveryCodes).toHaveLength(10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          twoFactorEnabled: true,
          twoFactorSecret: `enc:${secret}`,
          twoFactorEnabledAt: expect.any(Date),
        }),
      });
      expect(prisma.twoFactorRecoveryCode.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: 'user-1',
            hashedCode: expect.stringMatching(/^hashed:/),
          }),
        ]),
      });
      // 10 codes generated
      const createManyCall = prisma.twoFactorRecoveryCode.createMany.mock.calls[0][0];
      expect(createManyCall.data).toHaveLength(10);
      // Revoke other refresh tokens
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revoked: false },
        data: { revoked: true },
      });
    });
  });

  // ===========================================================================
  // disable — blocked when instance enforces
  // ===========================================================================

  describe('disable', () => {
    const user = buildUser({ twoFactorEnabled: true, twoFactorSecret: 'enc:SECRET' });

    beforeEach(() => {
      // SaaS by default → enforcement is always off
      config.get.mockImplementation((key: string) =>
        key === 'globalConfig.isSelfHostedMode' ? false : undefined,
      );
    });

    it('throws when 2FA is not enabled', async () => {
      await expect(
        service.disable(buildUser({ twoFactorEnabled: false }) as any, '123456', false),
      ).rejects.toBeInstanceOf(TwoFactorNotEnabledError);
    });

    it('throws when instance enforces require2FA, regardless of code correctness', async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'globalConfig.isSelfHostedMode') return true;
        return undefined;
      });
      prisma.instanceSetting.findUnique.mockResolvedValue({
        require2FA: true,
        license: 'instance-token',
      });
      license.hasFeature.mockResolvedValue(true);
      jest.spyOn(authenticator, 'check').mockReturnValue(true);

      await expect(service.disable(user as any, '123456', false)).rejects.toBeInstanceOf(
        TwoFactorEnforcedDisableNotAllowedError,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('clears secret and recovery codes when allowed', async () => {
      jest.spyOn(authenticator, 'check').mockReturnValue(true);
      await service.disable(user as any, '123456', false);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnabledAt: null },
      });
      expect(prisma.twoFactorRecoveryCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  // ===========================================================================
  // signChallengeToken — payload shape
  // ===========================================================================

  describe('signChallengeToken', () => {
    it('signs with userId, purpose, and a fresh jti', () => {
      jwt.sign.mockReturnValue('signed-jwt');
      const token = service.signChallengeToken('user-1', 'mfa-verify');

      expect(token).toBe('signed-jwt');
      const payload = jwt.sign.mock.calls[0][0] as any;
      expect(payload).toMatchObject({ sub: 'user-1', purpose: 'mfa-verify' });
      expect(payload.jti).toEqual(expect.any(String));
      expect(payload.jti).toHaveLength(36); // randomUUID
    });
  });
});
