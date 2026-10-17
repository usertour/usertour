import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import {
  FeatureRequiresLicenseError,
  InstanceLicenseRequiredError,
  SystemAdminMustEnable2FAFirstError,
} from '@/modules/common/errors/errors';
import { LicenseService } from '@/modules/license/services/license.service';
import { PasswordService } from '@/modules/auth/services/password.service';
import { TeamService } from '@/modules/team/services/team.service';
import { AdminService } from './admin.service';

const buildService = async () => {
  const prisma: any = {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    project: { findUnique: jest.fn(), update: jest.fn() },
    instanceSetting: { upsert: jest.fn(), findUnique: jest.fn() },
    refreshToken: { deleteMany: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(prisma)),
  };
  const license = {
    hasFeature: jest.fn().mockResolvedValue(true),
    validateLicense: jest.fn(),
    getLicensePayload: jest.fn(),
  } as unknown as jest.Mocked<LicenseService>;

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AdminService,
      { provide: PrismaService, useValue: prisma },
      { provide: ConfigService, useValue: { get: jest.fn() } },
      { provide: LicenseService, useValue: license },
      { provide: PasswordService, useValue: {} },
      { provide: TeamService, useValue: {} },
    ],
  }).compile();

  return { service: module.get<AdminService>(AdminService), prisma, license };
};

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
    ({ service, prisma, license } = await buildService());
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
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: { in: ['user-A', 'user-B', 'user-C'] },
      },
    });
  });

  it('on turn-ON with no non-enrolled users: skips the refresh-token revoke entirely', async () => {
    prisma.user.findUnique.mockResolvedValue({ twoFactorEnabled: true });
    fullyLicensed();
    prisma.user.findMany.mockResolvedValue([]);

    await service.updateInstanceRequire2FA('admin-1', true);

    expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it('on turn-OFF: does NOT touch refresh tokens (turning off must not log anyone out)', async () => {
    // Turn-off path skips the actor and license preconditions entirely.
    await service.updateInstanceRequire2FA('admin-1', false);

    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    expect(prisma.instanceSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { require2FA: false },
      }),
    );
  });
});

describe('AdminService.updateProjectUsesInstanceLicense', () => {
  let service: AdminService;
  let prisma: any;

  beforeEach(async () => {
    ({ service, prisma } = await buildService());
    prisma.instanceSetting.findUnique.mockResolvedValue({ instanceId: 'inst', license: null });
  });

  const project = (usesInstanceLicense: boolean) =>
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      usesInstanceLicense,
      license: null,
    });

  it('refuses to assign the instance license when the instance has none', async () => {
    project(false);

    await expect(
      service.updateProjectUsesInstanceLicense('project-1', true),
    ).rejects.toBeInstanceOf(InstanceLicenseRequiredError);
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it('releases the instance license without one, so a lapsed assignment can be cleaned up', async () => {
    project(true);

    await expect(service.updateProjectUsesInstanceLicense('project-1', false)).resolves.toBe(true);
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      data: { usesInstanceLicense: false },
    });
  });
});
