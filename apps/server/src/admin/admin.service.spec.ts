import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { FeatureRequiresLicenseError, SystemAdminMustEnable2FAFirstError } from '@/common/errors';
import { LicenseService } from '@/license/license.service';
import { PasswordService } from '@/auth/password.service';
import { AdminService } from './admin.service';

// Focused regression for the Layer-A piece of "instance enforces 2FA":
// flipping require2FA=true must, in the same transaction, kill the refresh
// tokens of users who have not enrolled. Without this revoke, a non-enrolled
// user with a live session keeps using the app for up to a full refresh
// window (~7 days) after the policy turned on.

describe('AdminService.updateInstanceRequire2FA', () => {
  let service: AdminService;
  let prisma: any;
  let license: jest.Mocked<LicenseService>;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), findMany: jest.fn() },
      instanceSetting: { upsert: jest.fn(), findUnique: jest.fn() },
      refreshToken: { updateMany: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    license = {
      hasFeature: jest.fn().mockResolvedValue(true),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: LicenseService, useValue: license },
        { provide: PasswordService, useValue: {} },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  const fullyLicensed = () => {
    prisma.instanceSetting.findUnique.mockResolvedValue({ license: 'inst-token' });
    license.hasFeature.mockResolvedValue(true);
  };

  it('rejects when the actor has not enabled 2FA on their own account', async () => {
    prisma.user.findUnique.mockResolvedValue({ twoFactorEnabled: false });
    await expect(service.updateInstanceRequire2FA('admin-1', true)).rejects.toBeInstanceOf(
      SystemAdminMustEnable2FAFirstError,
    );
  });

  it('rejects when the instance license does not cover the 2FA feature', async () => {
    prisma.user.findUnique.mockResolvedValue({ twoFactorEnabled: true });
    prisma.instanceSetting.findUnique.mockResolvedValue({ license: 'inst-token' });
    license.hasFeature.mockResolvedValue(false);

    await expect(service.updateInstanceRequire2FA('admin-1', true)).rejects.toBeInstanceOf(
      FeatureRequiresLicenseError,
    );
  });

  it('on turn-ON: revokes refresh tokens of every user without 2FA', async () => {
    prisma.user.findUnique.mockResolvedValue({ twoFactorEnabled: true });
    fullyLicensed();
    prisma.user.findMany.mockResolvedValue([{ id: 'user-A' }, { id: 'user-B' }, { id: 'user-C' }]);
    prisma.instanceSetting.upsert.mockResolvedValue({ key: 'instance', require2FA: true });

    await service.updateInstanceRequire2FA('admin-1', true);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { twoFactorEnabled: false },
      select: { id: true },
    });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        revoked: false,
        userId: { in: ['user-A', 'user-B', 'user-C'] },
      },
      data: { revoked: true },
    });
  });

  it('on turn-ON with no non-enrolled users: skips the refresh-token revoke entirely', async () => {
    prisma.user.findUnique.mockResolvedValue({ twoFactorEnabled: true });
    fullyLicensed();
    prisma.user.findMany.mockResolvedValue([]);

    await service.updateInstanceRequire2FA('admin-1', true);

    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('on turn-OFF: does NOT touch refresh tokens (turning off must not log anyone out)', async () => {
    // Turn-off path skips the actor and license preconditions entirely.
    await service.updateInstanceRequire2FA('admin-1', false);

    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(prisma.instanceSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { require2FA: false },
      }),
    );
  });
});
