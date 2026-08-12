import { FeatureRequiresLicenseError } from '@/common/errors/errors';
import { AuditResolver } from './audit.resolver';

// The plan read-window is a tri-state: -1 = unlimited, 0 = none, N = last N days.
// The resolver must pass a cutoff to listAuditLogs that honors it — in particular
// `0` must read NOTHING (a far-future cutoff), never be lumped into the unlimited
// branch and leak the whole history.
describe('AuditResolver read-window cutoff', () => {
  const build = (auditLogs: boolean, auditLogRetentionDays: number) => {
    const listAuditLogs = jest.fn().mockResolvedValue({ edges: [], pageInfo: {} });
    const projectsService = {
      getProjectConfig: jest.fn().mockResolvedValue({ auditLogs, auditLogRetentionDays }),
    };
    const resolver = new AuditResolver({ listAuditLogs } as never, projectsService as never);
    return { resolver, listAuditLogs };
  };
  const cutoffArg = (listAuditLogs: jest.Mock): Date | undefined => listAuditLogs.mock.calls[0][4];

  it('retentionDays 0 → a far-future cutoff (reads nothing)', async () => {
    const { resolver, listAuditLogs } = build(true, 0);
    await resolver.auditLogs('p1', {} as never, undefined as never, undefined as never);
    const cutoff = cutoffArg(listAuditLogs);
    expect(cutoff).toBeInstanceOf(Date);
    expect((cutoff as Date).getTime()).toBeGreaterThan(Date.now()); // in the future → excludes all
  });

  it('retentionDays -1 → no cutoff (unlimited)', async () => {
    const { resolver, listAuditLogs } = build(true, -1);
    await resolver.auditLogs('p1', {} as never, undefined as never, undefined as never);
    expect(cutoffArg(listAuditLogs)).toBeUndefined();
  });

  it('retentionDays N → a cutoff ~N days ago', async () => {
    const { resolver, listAuditLogs } = build(true, 7);
    await resolver.auditLogs('p1', {} as never, undefined as never, undefined as never);
    const cutoff = cutoffArg(listAuditLogs) as Date;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoff.getTime() - sevenDaysAgo)).toBeLessThan(5000);
  });

  it('rejects when audit viewing is not entitled', async () => {
    const { resolver } = build(false, -1);
    await expect(
      resolver.auditLogs('p1', {} as never, undefined as never, undefined as never),
    ).rejects.toBeInstanceOf(FeatureRequiresLicenseError);
  });
});
