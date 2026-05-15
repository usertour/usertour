import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from 'nestjs-prisma';
import {
  AccountNotFoundError,
  PasswordIncorrect,
  TooManyLoginAttemptsError,
} from '@/common/errors';
import {
  QUEUE_INITIALIZE_PROJECT,
  QUEUE_SEND_MAGIC_LINK_EMAIL,
  QUEUE_SEND_RESET_PASSWORD_EMAIL,
} from '@/common/consts/queen';
import { RedisService } from '@/shared/redis.service';
import { TeamService } from '@/team/team.service';
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
      },
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
        { provide: RedisService, useValue: redis },
        { provide: TwoFactorService, useValue: twoFactor },
        { provide: getQueueToken(QUEUE_SEND_MAGIC_LINK_EMAIL), useValue: noopQueue },
        { provide: getQueueToken(QUEUE_SEND_RESET_PASSWORD_EMAIL), useValue: noopQueue },
        { provide: getQueueToken(QUEUE_INITIALIZE_PROJECT), useValue: noopQueue },
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
});
