import {
  OUTBOUND_ERROR_MAX_LENGTH,
  OUTBOUND_MESSAGE_RETENTION_DAYS,
  OUTBOUND_RESPONSE_BODY_MAX_LENGTH,
  OutboundLedgerService,
} from './outbound-ledger.service';

describe('OutboundLedgerService', () => {
  let prisma: {
    outboundMessage: {
      createMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
      findUnique: jest.Mock;
    };
    outboundDelivery: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: OutboundLedgerService;

  beforeEach(() => {
    prisma = {
      outboundMessage: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockReturnValue('update-op'),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
        findUnique: jest.fn(),
      },
      outboundDelivery: { create: jest.fn().mockReturnValue('create-op') },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const cleanupQueue = {
      getJobSchedulers: jest.fn(),
      removeJobScheduler: jest.fn(),
      add: jest.fn(),
    };
    service = new OutboundLedgerService(prisma as any, cleanupQueue as any);
  });

  it('maps a destination onto exactly one FK column', async () => {
    await service.createMessages([
      {
        id: 'whmsg_1',
        environmentId: 'env_1',
        destination: { webhookId: 'wh_1' },
        topic: 'event.tracked.flow_started',
        payload: { id: 'whmsg_1' },
      },
      {
        id: 'msg_2',
        environmentId: 'env_1',
        destination: { integrationId: 'int_1' },
        topic: 'event.tracked.flow_started',
        payload: { id: 'msg_2' },
      },
    ]);
    const rows = prisma.outboundMessage.createMany.mock.calls[0][0].data;
    expect(rows[0]).toEqual(expect.objectContaining({ webhookId: 'wh_1' }));
    expect(rows[0]).not.toHaveProperty('integrationId');
    expect(rows[1]).toEqual(expect.objectContaining({ integrationId: 'int_1' }));
    expect(rows[1]).not.toHaveProperty('webhookId');
  });

  it('skips the write entirely for an empty batch', async () => {
    await service.createMessages([]);
    expect(prisma.outboundMessage.createMany).not.toHaveBeenCalled();
  });

  describe('recordAttempt', () => {
    const base = { attempt: 1, responseStatus: 200, durationMs: 12 };

    it('marks the message DELIVERED on success', async () => {
      await service.recordAttempt('whmsg_1', { ...base, success: true, final: false });
      expect(prisma.outboundMessage.update).toHaveBeenCalledWith({
        where: { id: 'whmsg_1' },
        data: { status: 'DELIVERED' },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(['create-op', 'update-op']);
    });

    it('leaves a non-final failure PENDING (more retries to come)', async () => {
      await service.recordAttempt('whmsg_1', { ...base, success: false, final: false });
      expect(prisma.outboundMessage.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalledWith(['create-op']);
    });

    it('marks the message FAILED when the final attempt fails', async () => {
      await service.recordAttempt('whmsg_1', { ...base, success: false, final: true });
      expect(prisma.outboundMessage.update).toHaveBeenCalledWith({
        where: { id: 'whmsg_1' },
        data: { status: 'FAILED' },
      });
    });

    it('truncates stored excerpts and normalizes empties to null', async () => {
      await service.recordAttempt('whmsg_1', {
        ...base,
        success: false,
        final: false,
        error: 'x'.repeat(OUTBOUND_ERROR_MAX_LENGTH + 50),
        responseBody: 'y'.repeat(OUTBOUND_RESPONSE_BODY_MAX_LENGTH + 50),
      });
      const data = prisma.outboundDelivery.create.mock.calls[0][0].data;
      expect(data.error).toHaveLength(OUTBOUND_ERROR_MAX_LENGTH);
      expect(data.responseBody).toHaveLength(OUTBOUND_RESPONSE_BODY_MAX_LENGTH);

      await service.recordAttempt('whmsg_1', {
        ...base,
        success: true,
        final: true,
        responseBody: '',
      });
      expect(prisma.outboundDelivery.create.mock.calls[1][0].data.responseBody).toBeNull();
    });

    it('never throws — a ledger write failure must not affect delivery', async () => {
      prisma.$transaction.mockRejectedValue(new Error('db blip'));
      await expect(
        service.recordAttempt('whmsg_1', { ...base, success: true, final: true }),
      ).resolves.toBeUndefined();
    });
  });

  describe('resend claim (CAS)', () => {
    it('claims only a settled, unmoved message (updatedAt CAS) and reports a lost race', async () => {
      const asOf = new Date('2026-08-19T10:00:00.000Z');
      prisma.outboundMessage.updateMany = jest.fn().mockResolvedValueOnce({ count: 1 });
      await expect(service.claimForResend('whmsg_1', asOf)).resolves.toBe(true);
      expect(prisma.outboundMessage.updateMany).toHaveBeenCalledWith({
        where: { id: 'whmsg_1', updatedAt: asOf, status: { in: ['DELIVERED', 'FAILED'] } },
        data: { status: 'PENDING' },
      });

      // Same status but a different updatedAt (ABA: another resend cycle ran
      // in between) → the stale claim loses.
      prisma.outboundMessage.updateMany = jest.fn().mockResolvedValueOnce({ count: 0 });
      await expect(service.claimForResend('whmsg_1', asOf)).resolves.toBe(false);
    });

    it('release restores the prior status only while still PENDING', async () => {
      prisma.outboundMessage.updateMany = jest.fn().mockResolvedValue({ count: 1 });
      await service.releaseResendClaim('whmsg_1', 'FAILED' as never);
      expect(prisma.outboundMessage.updateMany).toHaveBeenCalledWith({
        where: { id: 'whmsg_1', status: 'PENDING' },
        data: { status: 'FAILED' },
      });
    });
  });

  it('deletes messages older than the retention window', async () => {
    const now = new Date('2026-08-18T00:00:00.000Z');
    const count = await service.deleteExpired(now);
    expect(count).toBe(3);
    const cutoff = prisma.outboundMessage.deleteMany.mock.calls[0][0].where.createdAt.lt as Date;
    expect((now.getTime() - cutoff.getTime()) / 86_400_000).toBe(OUTBOUND_MESSAGE_RETENTION_DAYS);
  });
});
