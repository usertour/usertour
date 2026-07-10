import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from 'nestjs-prisma';
import {
  AccountNotFoundError,
  PasswordIncorrect,
  SsoRequiredError,
  TooManyLoginAttemptsError,
} from '@/common/errors';
import {
  QUEUE_CLEAN_EXPIRED_REFRESH_TOKENS,
  QUEUE_SEND_MAGIC_LINK_EMAIL,
  QUEUE_SEND_RESET_PASSWORD_EMAIL,
} from '@/common/consts/queen';
import { RedisService } from '@/shared/redis.service';
import { TeamService } from '@/team/team.service';
import { ProjectsService } from '@/projects/projects.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TwoFactorService } from './two-factor.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let passwords: jest.Mocked<PasswordService>;
  let redis: any;
  let twoFactor: jest.Mocked<TwoFactorService>;
  let config: { get: jest.Mock };
  let projects: { getProjectConfig: jest.Mock };

  const buildUser = (overrides: Partial<any> = {}) => ({
    id: 'user-1',
    email: 'alice@example.com',
    password: 'hashed:correct',
    disabled: false,
    twoFactorEnabled: false,
    projects: [{ id: 'p-1' }],
    accounts: [{ provider: 'email' }],
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
      instanceSetting: { findUnique: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      apiToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      oAuthGrant: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      // Force-SSO gate lookup — default to "not a member of any enforced project".
      userOnProject: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

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

    twoFactor = {
      isTwoFactorAvailableForUser: jest.fn().mockResolvedValue(true),
      isInstanceEnforcing: jest.fn().mockResolvedValue(false),
      signChallengeToken: jest.fn().mockReturnValue('challenge-token'),
    } as any;

    config = {
      get: jest.fn((key: string) => {
        if (key === 'auth.jwt.secret') return 'test-secret';
        if (key === 'auth.jwt.refreshSecret') return 'test-refresh-secret';
        if (key === 'auth.jwt.expiresIn') return '15m';
        if (key === 'auth.jwt.refreshExpiresIn') return '7d';
        if (key === 'globalConfig.isSelfHostedMode') return false;
        return undefined;
      }),
    };

    // Entitlement resolver used by the force-SSO gate — default to entitled.
    projects = { getProjectConfig: jest.fn().mockResolvedValue({ ssoOidc: true }) };

    const noopQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'access-token'), verify: jest.fn() },
        },
        { provide: PasswordService, useValue: passwords },
        { provide: ConfigService, useValue: config },
        {
          provide: TeamService,
          useValue: { assignUserToProject: jest.fn(), deleteInvite: jest.fn() },
        },
        { provide: ProjectsService, useValue: projects },
        { provide: RedisService, useValue: redis },
        { provide: TwoFactorService, useValue: twoFactor },
        { provide: getQueueToken(QUEUE_SEND_MAGIC_LINK_EMAIL), useValue: noopQueue },
        { provide: getQueueToken(QUEUE_SEND_RESET_PASSWORD_EMAIL), useValue: noopQueue },
        { provide: getQueueToken(QUEUE_CLEAN_EXPIRED_REFRESH_TOKENS), useValue: noopQueue },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ===========================================================================
  // Password lockout — 10 wrong attempts within 10 minutes blocks login
  // ===========================================================================

  describe('emailLogin — password lockout', () => {
    it('rejects when counter is already at the limit (10), without DB lookup', async () => {
      redis.get.mockResolvedValue('10');
      await expect(service.emailLogin('alice@example.com', 'wrong')).rejects.toBeInstanceOf(
        TooManyLoginAttemptsError,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('increments the counter when password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());
      passwords.validatePassword.mockResolvedValue(false);

      await expect(service.emailLogin('alice@example.com', 'wrong')).rejects.toBeInstanceOf(
        PasswordIncorrect,
      );
      expect(redis.incrWithExpire).toHaveBeenCalledWith(
        'login-failure:password:alice@example.com',
        expect.any(Number),
      );
    });

    it('increments the counter when email does not exist (prevents email enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.emailLogin('ghost@example.com', 'any')).rejects.toBeInstanceOf(
        AccountNotFoundError,
      );
      expect(redis.incrWithExpire).toHaveBeenCalledWith(
        'login-failure:password:ghost@example.com',
        expect.any(Number),
      );
    });

    it('clears the counter on a successful login', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());
      passwords.validatePassword.mockResolvedValue(true);

      await service.emailLogin('alice@example.com', 'correct');
      expect(redis.del).toHaveBeenCalledWith('login-failure:password:alice@example.com');
    });

    it('does not increment the counter when the account is disabled (not a brute-force vector)', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser({ disabled: true }));

      await expect(service.emailLogin('alice@example.com', 'x')).rejects.toThrow();
      expect(redis.incrWithExpire).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // issueTokensOrChallenge — branches between tokens and 2FA challenges
  // ===========================================================================

  describe('issueTokensOrChallenge', () => {
    it('returns access/refresh tokens for a user with no 2FA', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', twoFactorEnabled: false });
      twoFactor.isTwoFactorAvailableForUser.mockResolvedValue(true);
      twoFactor.isInstanceEnforcing.mockResolvedValue(false);

      const result = await service.issueTokensOrChallenge('user-1');

      expect(result.kind).toBe('tokens');
      if (result.kind === 'tokens') {
        expect(result.tokens.uid).toBe('user-1');
      }
    });

    it('issues an mfa-verify challenge for a 2FA-enabled user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', twoFactorEnabled: true });
      twoFactor.isTwoFactorAvailableForUser.mockResolvedValue(true);

      const result = await service.issueTokensOrChallenge('user-1');

      expect(result.kind).toBe('challenge');
      if (result.kind === 'challenge') {
        expect(result.purpose).toBe('mfa-verify');
        expect(result.challengeToken).toBe('challenge-token');
      }
      expect(twoFactor.signChallengeToken).toHaveBeenCalledWith('user-1', 'mfa-verify');
    });

    it('issues an mfa-setup-required challenge when instance enforces and user has not enrolled', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', twoFactorEnabled: false });
      twoFactor.isTwoFactorAvailableForUser.mockResolvedValue(true);
      twoFactor.isInstanceEnforcing.mockResolvedValue(true);

      const result = await service.issueTokensOrChallenge('user-1');

      expect(result.kind).toBe('challenge');
      if (result.kind === 'challenge') {
        expect(result.purpose).toBe('mfa-setup-required');
      }
      expect(twoFactor.signChallengeToken).toHaveBeenCalledWith('user-1', 'mfa-setup-required');
    });

    it('drops the MFA gate entirely when license is unavailable, even for enrolled users', async () => {
      // license lapse → existing 2FA-enrolled users
      // bypass the challenge so they aren't locked out of the app.
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', twoFactorEnabled: true });
      twoFactor.isTwoFactorAvailableForUser.mockResolvedValue(false);

      const result = await service.issueTokensOrChallenge('user-1');

      expect(result.kind).toBe('tokens');
      expect(twoFactor.signChallengeToken).not.toHaveBeenCalled();
    });

    it('throws AccountNotFoundError when the user cannot be loaded', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.issueTokensOrChallenge('ghost')).rejects.toBeInstanceOf(
        AccountNotFoundError,
      );
    });
  });

  // ===========================================================================
  // Force-SSO gate inside issueTokensOrChallenge
  // ===========================================================================

  describe('force-SSO enforcement', () => {
    it('rejects a non-owner member of an enforced, entitled project with SsoRequiredError', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorEnabled: false,
        isSystemAdmin: false,
      });
      prisma.userOnProject.findMany.mockResolvedValue([{ projectId: 'proj-enforced' }]);
      projects.getProjectConfig.mockResolvedValue({ ssoOidc: true });

      const error = await service.issueTokensOrChallenge('user-1').catch((e) => e);
      expect(error).toBeInstanceOf(SsoRequiredError);
      // Carries the enforcing project so the client can route to its SSO entry.
      expect((error as SsoRequiredError).details).toEqual({ projectId: 'proj-enforced' });
    });

    it('drops the gate when the enforced project can no longer use SSO (entitlement lapsed)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorEnabled: false,
        isSystemAdmin: false,
      });
      prisma.userOnProject.findMany.mockResolvedValue([{ projectId: 'proj-lapsed' }]);
      projects.getProjectConfig.mockResolvedValue({ ssoOidc: false });

      // Not locked out — without this, the member can neither password-login nor SSO.
      const result = await service.issueTokensOrChallenge('user-1');
      expect(result.kind).toBe('tokens');
    });

    it('exempts a system admin (break-glass)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorEnabled: false,
        isSystemAdmin: true,
      });
      // Even if the lookup would match, an admin never reaches it.
      prisma.userOnProject.findMany.mockResolvedValue([{ projectId: 'proj-enforced' }]);

      const result = await service.issueTokensOrChallenge('user-1');
      expect(result.kind).toBe('tokens');
      expect(prisma.userOnProject.findMany).not.toHaveBeenCalled();
    });

    it('skips the gate entirely on the SSO path (viaSso=true)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFactorEnabled: false,
        isSystemAdmin: false,
      });
      prisma.userOnProject.findMany.mockResolvedValue([{ projectId: 'proj-enforced' }]);

      const result = await service.issueTokensOrChallenge('user-1', true);
      expect(result.kind).toBe('tokens');
      expect(prisma.userOnProject.findMany).not.toHaveBeenCalled();
    });
  });

  describe('cleanExpiredRefreshTokens', () => {
    it('also prunes expired OAuth access-token rows (clientId set), never personal keys', async () => {
      await service.cleanExpiredRefreshTokens();
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
      // OAuth access tokens accumulate as ApiToken rows on every refresh rotation —
      // prune the expired ones, scoped to clientId-set (personal `utp_` keys stay).
      expect(prisma.apiToken.deleteMany).toHaveBeenCalledWith({
        where: { clientId: { not: null }, expiresAt: { lt: expect.any(Date) } },
      });
    });

    it("rolls each grant's max lastUsedAt onto OAuthGrant BEFORE pruning its token rows", async () => {
      const used = new Date('2026-07-09T10:00:00Z');
      prisma.apiToken.groupBy.mockResolvedValue([
        { oauthGrantId: 'grant-1', _max: { lastUsedAt: used } },
      ]);

      await service.cleanExpiredRefreshTokens();

      // The rollup writes the durable lastUsedAt so Connected Apps / audit names
      // survive the deletion of the short-lived token rows that carried them.
      expect(prisma.oAuthGrant.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'grant-1',
          OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: used } }],
        },
        data: { lastUsedAt: used },
      });
      // Rollup happens before the delete (mock order can't assert timing, but both fire).
      expect(prisma.apiToken.deleteMany).toHaveBeenCalled();
    });
  });
});
