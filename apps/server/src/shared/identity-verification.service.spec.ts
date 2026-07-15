import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import { EncryptionService } from './encryption.service';
import {
  IdentityVerificationService,
  isAnonymousExternalUserId,
} from './identity-verification.service';
import { RedisService } from './redis.service';

describe('IdentityVerificationService', () => {
  let service: IdentityVerificationService;

  // Secrets are AES-256-GCM encrypted at rest; the mock encodes that as an
  // `encrypted:` envelope so a missed decrypt shows up as a verify failure.
  const encryptionServiceMock = {
    encrypt: jest.fn((value: string) => `encrypted:${value}`),
    decrypt: jest.fn((value: string) =>
      value.startsWith('encrypted:') ? value.slice('encrypted:'.length) : null,
    ),
  };

  const plainSecret = 'utv_test-secret';

  const activeSecret = {
    id: 'secret-1',
    environmentId: 'env-1',
    secret: `encrypted:${plainSecret}`,
    createdAt: new Date(),
    lastUsedAt: null,
    revokedAt: null,
  };

  const prismaMock = {
    environmentSigningSecret: {
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue(activeSecret),
    },
  };

  const redisPipelineMock = {
    hincrby: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    hgetall: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };

  const redisClientMock = {
    set: jest.fn().mockResolvedValue(null),
    pipeline: jest.fn(() => redisPipelineMock),
  };

  const redisServiceMock = {
    getClient: jest.fn(() => redisClientMock),
  };

  // Mints customer-side identity tokens exactly as the docs instruct.
  const tokenSigner = new JwtService({});
  const mintToken = (
    secret: string,
    payload: Record<string, unknown>,
    expiresIn?: string | number,
  ) =>
    tokenSigner.sign(payload, {
      secret,
      algorithm: 'HS256',
      ...(expiresIn !== undefined ? { expiresIn } : {}),
    });

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.environmentSigningSecret.findMany.mockResolvedValue([activeSecret]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityVerificationService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: redisServiceMock },
        { provide: EncryptionService, useValue: encryptionServiceMock },
        { provide: JwtService, useValue: new JwtService({}) },
      ],
    }).compile();

    service = module.get<IdentityVerificationService>(IdentityVerificationService);
  });

  describe('isAnonymousExternalUserId', () => {
    it('accepts SDK-generated anonymous ids (anon- + UUID v4)', () => {
      expect(isAnonymousExternalUserId('anon-2f1acc6c-8f3e-4a54-9c1d-3f2b1a0e9d8c')).toBe(true);
    });

    it('rejects plain user ids and malformed anonymous ids', () => {
      expect(isAnonymousExternalUserId('user-123')).toBe(false);
      expect(isAnonymousExternalUserId('anon-not-a-uuid')).toBe(false);
      // UUID v1 (version nibble 1) must not pass as v4
      expect(isAnonymousExternalUserId('anon-2f1acc6c-8f3e-1a54-9c1d-3f2b1a0e9d8c')).toBe(false);
    });
  });

  describe('verifyUserIdentity', () => {
    it('returns valid for a token signed with an active secret', async () => {
      const verdict = await service.verifyUserIdentity(
        'env-1',
        'user-123',
        mintToken(plainSecret, { sub: 'user-123' }),
      );
      expect(verdict).toBe('valid');
    });

    it('returns valid for a token with a future expiry', async () => {
      const verdict = await service.verifyUserIdentity(
        'env-1',
        'user-123',
        mintToken(plainSecret, { sub: 'user-123' }, '1h'),
      );
      expect(verdict).toBe('valid');
    });

    it('returns invalid for an expired token', async () => {
      const verdict = await service.verifyUserIdentity(
        'env-1',
        'user-123',
        mintToken(plainSecret, { sub: 'user-123' }, -60),
      );
      expect(verdict).toBe('invalid');
    });

    it('returns invalid for a token signed with the wrong secret', async () => {
      const verdict = await service.verifyUserIdentity(
        'env-1',
        'user-123',
        mintToken('utv_other-secret', { sub: 'user-123' }),
      );
      expect(verdict).toBe('invalid');
    });

    it('returns invalid when the sub claim names a different user', async () => {
      const verdict = await service.verifyUserIdentity(
        'env-1',
        'user-123',
        mintToken(plainSecret, { sub: 'user-456' }),
      );
      expect(verdict).toBe('invalid');
    });

    it('returns invalid for a token without a sub claim', async () => {
      const verdict = await service.verifyUserIdentity(
        'env-1',
        'user-123',
        mintToken(plainSecret, { companyId: 'company-9' }),
      );
      expect(verdict).toBe('invalid');
    });

    it('returns invalid when no active secret exists', async () => {
      prismaMock.environmentSigningSecret.findMany.mockResolvedValue([]);
      const verdict = await service.verifyUserIdentity(
        'env-1',
        'user-123',
        mintToken(plainSecret, { sub: 'user-123' }),
      );
      expect(verdict).toBe('invalid');
    });

    it('accepts a token signed with the second (rotation) secret', async () => {
      const rotationSecret = {
        ...activeSecret,
        id: 'secret-2',
        secret: 'encrypted:utv_rotation-secret',
      };
      prismaMock.environmentSigningSecret.findMany.mockResolvedValue([
        rotationSecret,
        activeSecret,
      ]);
      const verdict = await service.verifyUserIdentity(
        'env-1',
        'user-123',
        mintToken(plainSecret, { sub: 'user-123' }),
      );
      expect(verdict).toBe('valid');
    });

    it('returns anonymous for an unsigned SDK anonymous id', async () => {
      const verdict = await service.verifyUserIdentity(
        'env-1',
        'anon-2f1acc6c-8f3e-4a54-9c1d-3f2b1a0e9d8c',
        undefined,
      );
      expect(verdict).toBe('anonymous');
    });

    it('returns missing for an unsigned regular id', async () => {
      const verdict = await service.verifyUserIdentity('env-1', 'user-123', undefined);
      expect(verdict).toBe('missing');
    });

    it('rejects a malformed token without throwing', async () => {
      const verdict = await service.verifyUserIdentity('env-1', 'user-123', 'not-a-jwt');
      expect(verdict).toBe('invalid');
    });
  });

  describe('verifyCompanyMembership', () => {
    it('returns valid when sub and companyId claims both match', async () => {
      const verdict = await service.verifyCompanyMembership(
        'env-1',
        'user-123',
        'company-9',
        mintToken(plainSecret, { sub: 'user-123', companyId: 'company-9' }),
      );
      expect(verdict).toBe('valid');
    });

    it('returns invalid for a user-only token (no companyId claim)', async () => {
      const verdict = await service.verifyCompanyMembership(
        'env-1',
        'user-123',
        'company-9',
        mintToken(plainSecret, { sub: 'user-123' }),
      );
      expect(verdict).toBe('invalid');
    });

    it('returns invalid when the companyId claim names a different company', async () => {
      const verdict = await service.verifyCompanyMembership(
        'env-1',
        'user-123',
        'company-9',
        mintToken(plainSecret, { sub: 'user-123', companyId: 'company-8' }),
      );
      expect(verdict).toBe('invalid');
    });

    it("returns invalid when the token proves a different user's membership", async () => {
      const verdict = await service.verifyCompanyMembership(
        'env-1',
        'user-123',
        'company-9',
        mintToken(plainSecret, { sub: 'user-456', companyId: 'company-9' }),
      );
      expect(verdict).toBe('invalid');
    });

    it('returns missing when unsigned, even for anonymous users', async () => {
      const verdict = await service.verifyCompanyMembership(
        'env-1',
        'anon-2f1acc6c-8f3e-4a54-9c1d-3f2b1a0e9d8c',
        'company-9',
        undefined,
      );
      expect(verdict).toBe('missing');
    });
  });

  describe('diagnoseIdentityToken', () => {
    it('reports valid with decoded claims', async () => {
      const diagnosis = await service.diagnoseIdentityToken(
        'env-1',
        mintToken(plainSecret, { sub: 'user-123', companyId: 'company-9' }, '1h'),
      );
      expect(diagnosis.status).toBe('valid');
      expect(diagnosis.subject).toBe('user-123');
      expect(diagnosis.companyId).toBe('company-9');
      expect(diagnosis.expiresAt).toBeInstanceOf(Date);
    });

    it('reports expired with the decoded claims', async () => {
      const diagnosis = await service.diagnoseIdentityToken(
        'env-1',
        mintToken(plainSecret, { sub: 'user-123' }, -60),
      );
      expect(diagnosis.status).toBe('expired');
      expect(diagnosis.subject).toBe('user-123');
    });

    it('reports invalid_signature for a token signed with an unknown secret', async () => {
      const diagnosis = await service.diagnoseIdentityToken(
        'env-1',
        mintToken('utv_other-secret', { sub: 'user-123' }),
      );
      expect(diagnosis.status).toBe('invalid_signature');
    });

    it('reports malformed for a non-JWT string', async () => {
      const diagnosis = await service.diagnoseIdentityToken('env-1', 'not-a-jwt');
      expect(diagnosis.status).toBe('malformed');
    });

    it('reports missing_subject for a verified token without sub', async () => {
      const diagnosis = await service.diagnoseIdentityToken(
        'env-1',
        mintToken(plainSecret, { companyId: 'company-9' }),
      );
      expect(diagnosis.status).toBe('missing_subject');
    });
  });

  describe('verifyConnectionIdentity', () => {
    const enforcedEnvironment = { id: 'env-1', requireIdentityVerification: true };
    const openEnvironment = { id: 'env-1', requireIdentityVerification: false };

    it('accepts a proven user without a company claim', async () => {
      const accepted = await service.verifyConnectionIdentity(
        enforcedEnvironment,
        'user-123',
        undefined,
        mintToken(plainSecret, { sub: 'user-123' }),
      );
      expect(accepted).toBe(true);
    });

    it('accepts a proven user with a matching company claim', async () => {
      const accepted = await service.verifyConnectionIdentity(
        enforcedEnvironment,
        'user-123',
        'company-9',
        mintToken(plainSecret, { sub: 'user-123', companyId: 'company-9' }),
      );
      expect(accepted).toBe(true);
    });

    it('rejects an unproven user when enforced', async () => {
      const accepted = await service.verifyConnectionIdentity(
        enforcedEnvironment,
        'user-123',
        undefined,
        undefined,
      );
      expect(accepted).toBe(false);
    });

    it('rejects a proven user whose company claim does not match, when enforced', async () => {
      const accepted = await service.verifyConnectionIdentity(
        enforcedEnvironment,
        'user-123',
        'company-9',
        mintToken(plainSecret, { sub: 'user-123', companyId: 'company-8' }),
      );
      expect(accepted).toBe(false);
    });

    it('accepts everything when enforcement is off', async () => {
      const accepted = await service.verifyConnectionIdentity(
        openEnvironment,
        'user-123',
        'company-9',
        undefined,
      );
      expect(accepted).toBe(true);
    });
  });

  describe('verifyGroupClaim', () => {
    const enforcedEnvironment = { id: 'env-1', requireIdentityVerification: true };

    it('accepts a matching membership claim when enforced', async () => {
      const accepted = await service.verifyGroupClaim(
        enforcedEnvironment,
        'user-123',
        'company-9',
        mintToken(plainSecret, { sub: 'user-123', companyId: 'company-9' }),
      );
      expect(accepted).toBe(true);
    });

    it('rejects an unsigned group claim when enforced, even for anonymous users', async () => {
      const accepted = await service.verifyGroupClaim(
        enforcedEnvironment,
        'anon-2f1acc6c-8f3e-4a54-9c1d-3f2b1a0e9d8c',
        'company-9',
        undefined,
      );
      expect(accepted).toBe(false);
    });
  });

  describe('isAcceptable', () => {
    it('passes everything when enforcement is off', () => {
      expect(service.isAcceptable('valid', false)).toBe(true);
      expect(service.isAcceptable('invalid', false)).toBe(true);
      expect(service.isAcceptable('missing', false)).toBe(true);
      expect(service.isAcceptable('anonymous', false)).toBe(true);
    });

    it('passes only proven identities and anonymous users when enforced', () => {
      expect(service.isAcceptable('valid', true)).toBe(true);
      expect(service.isAcceptable('anonymous', true)).toBe(true);
      expect(service.isAcceptable('invalid', true)).toBe(false);
      expect(service.isAcceptable('missing', true)).toBe(false);
    });
  });
});
