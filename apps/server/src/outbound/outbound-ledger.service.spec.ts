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
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
      findUnique: jest.Mock;
    };
    outboundDelivery: { create: jest.Mock };
    webhook?: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: OutboundLedgerService;

  beforeEach(() => {
    prisma = {
      outboundMessage: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockReturnValue('update-op'),
        updateMany: jest.fn().mockReturnValue('update-op' as never),
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
    await expect(service.createMessages([])).resolves.toEqual([]);
    expect(prisma.outboundMessage.createMany).not.toHaveBeenCalled();
  });

  describe('per-row fallback after a failed batch insert', () => {
    const inputs = ['whmsg_a', 'whmsg_b', 'whmsg_c'].map((id) => ({
      id,
      environmentId: 'env_1',
      destination: { webhookId: `wh_${id.slice(-1)}` },
      topic: 'event.tracked.flow_started',
      payload: { id },
    }));
    const failOnlyB = () => {
      prisma.outboundMessage.createMany.mockRejectedValueOnce(new Error('insert failed'));
      prisma.outboundMessage.create = jest
        .fn()
        .mockImplementation(async ({ data }: { data: { id: string } }) => {
          if (data.id === 'whmsg_b') {
            throw new Error('insert failed');
          }
          return data;
        });
      prisma.outboundMessage.findUnique = jest.fn().mockResolvedValue(null);
    };

    it('a deleted destination drops ITS row quietly and never sinks the batch', async () => {
      failOnlyB();
      prisma.webhook = { findUnique: jest.fn().mockResolvedValue(null) };

      await expect(service.createMessages(inputs)).resolves.toEqual(['whmsg_a', 'whmsg_c']);
      // a, b, b-retry (one paced retry before diagnosing), c.
      expect(prisma.outboundMessage.create).toHaveBeenCalledTimes(4);
      // The quiet branch really ran: the destination WAS consulted and gone.
      expect(prisma.webhook?.findUnique).toHaveBeenCalledWith({
        where: { id: 'wh_b' },
        select: { id: true },
      });
    });

    it('a still-present destination is a LOUD loss, not a "vanished" excuse', async () => {
      failOnlyB();
      prisma.webhook = { findUnique: jest.fn().mockResolvedValue({ id: 'wh_b' }) };

      await expect(service.createMessages(inputs)).resolves.toEqual(['whmsg_a', 'whmsg_c']);
      expect(prisma.outboundMessage.create).toHaveBeenCalledTimes(4);
    });

    it('a committed-but-unacknowledged first insert counts as persisted (no false LOST)', async () => {
      failOnlyB();
      // The retry hit the id unique constraint because the FIRST insert
      // actually committed: the row exists — report it persisted so the
      // caller enqueues instead of parking it for the sweep's 14h detour.
      prisma.outboundMessage.findUnique = jest.fn().mockResolvedValue({ id: 'whmsg_b' });
      prisma.webhook = { findUnique: jest.fn() };

      await expect(service.createMessages(inputs)).resolves.toEqual([
        'whmsg_a',
        'whmsg_b',
        'whmsg_c',
      ]);
      // Diagnosis never reached the destination check.
      expect(prisma.webhook?.findUnique).not.toHaveBeenCalled();
    });
  });

  it('touch bumps updatedAt only while PENDING and never throws', async () => {
    prisma.outboundMessage.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    await service.touch('whmsg_1');
    expect(prisma.outboundMessage.updateMany).toHaveBeenCalledWith({
      where: { id: 'whmsg_1', status: 'PENDING' },
      data: { updatedAt: expect.any(Date) },
    });

    prisma.outboundMessage.updateMany = jest.fn().mockRejectedValue(new Error('db blip'));
    await expect(service.touch('whmsg_1')).resolves.toBeUndefined();
  });

  describe('recordAttempt', () => {
    const base = { attempt: 1, responseStatus: 200, durationMs: 12 };

    it('marks the message DELIVERED on success — sticky over FAILED (settle CAS)', async () => {
      await service.recordAttempt('whmsg_1', { ...base, success: true, final: false });
      // DELIVERED may overwrite FAILED (a late success from a stalled twin
      // job proves the message WAS delivered) but a settled DELIVERED row is
      // never re-written.
      expect(prisma.outboundMessage.updateMany).toHaveBeenCalledWith({
        where: { id: 'whmsg_1', status: { in: ['PENDING', 'FAILED'] } },
        data: { status: 'DELIVERED' },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(['create-op', 'update-op']);
    });

    it('leaves a non-final failure PENDING but touches updatedAt (last-activity signal)', async () => {
      await service.recordAttempt('whmsg_1', { ...base, success: false, final: false });
      // No status change — but the touch stamps last-activity so the
      // reconcile sweep can tell a live ladder from an orphaned message.
      // PENDING-guarded: a stale twin's touch must not disturb a settled row.
      expect(prisma.outboundMessage.updateMany).toHaveBeenCalledWith({
        where: { id: 'whmsg_1', status: 'PENDING' },
        data: { updatedAt: expect.any(Date) },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(['create-op', 'update-op']);
    });

    it('marks the message FAILED only from PENDING (a stale twin cannot downgrade DELIVERED)', async () => {
      await service.recordAttempt('whmsg_1', { ...base, success: false, final: true });
      expect(prisma.outboundMessage.updateMany).toHaveBeenCalledWith({
        where: { id: 'whmsg_1', status: 'PENDING' },
        data: { status: 'FAILED' },
      });
    });

    it('strips NUL bytes before storing (Postgres text rejects them wholesale)', async () => {
      await service.recordAttempt('whmsg_1', {
        ...base,
        success: false,
        final: false,
        responseBody: 'ok\u0000bad\u0000',
        error: '\u0000boom',
      });
      const row = prisma.outboundDelivery.create.mock.calls[0][0].data;
      // Without this, the INSERT fails, the whole transaction rolls back, and
      // a DELIVERED message would sit PENDING for the sweep to re-deliver.
      expect(row.responseBody).toBe('okbad');
      expect(row.error).toBe('boom');
    });

    it('a value that NUL-stripping empties stores as NULL, the column convention', async () => {
      await service.recordAttempt('whmsg_1', {
        ...base,
        success: false,
        final: false,
        responseBody: '\u0000\u0000',
      });
      const row = prisma.outboundDelivery.create.mock.calls[0][0].data;
      expect(row.responseBody).toBeNull();
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
      // Transient fault: the settle is worth brief retries — a swallowed
      // DELIVERED settle leaves PENDING for the sweep to re-deliver.
      expect(prisma.$transaction).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('does not retry deterministic failures (FK gone, unique conflict, row vanished)', async () => {
      prisma.$transaction.mockRejectedValue(
        Object.assign(new Error('FK violation'), { code: 'P2003' }),
      );
      await expect(
        service.recordAttempt('whmsg_1', { ...base, success: false, final: true }),
      ).resolves.toBeUndefined();
      // A message aged out of retention does not heal by waiting 150ms.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('resend claim (CAS)', () => {
    it('claims only a settled, unmoved message (updatedAt CAS) and stamps its generation', async () => {
      const asOf = new Date('2026-08-19T10:00:00.000Z');
      prisma.outboundMessage.updateMany = jest.fn().mockResolvedValueOnce({ count: 1 });
      const claimStamp = await service.claimForResend('whmsg_1', asOf);
      expect(claimStamp).toBeInstanceOf(Date);
      expect(prisma.outboundMessage.updateMany).toHaveBeenCalledWith({
        where: { id: 'whmsg_1', updatedAt: asOf, status: { in: ['DELIVERED', 'FAILED'] } },
        data: { status: 'PENDING', updatedAt: claimStamp },
      });

      // Same status but a different updatedAt (ABA: another resend cycle ran
      // in between) → the stale claim loses.
      prisma.outboundMessage.updateMany = jest.fn().mockResolvedValueOnce({ count: 0 });
      await expect(service.claimForResend('whmsg_1', asOf)).resolves.toBeNull();
    });

    it('release restores the prior status only for its OWN still-pending claim', async () => {
      const claimStamp = new Date('2026-08-19T10:00:01.000Z');
      prisma.outboundMessage.updateMany = jest.fn().mockResolvedValue({ count: 1 });
      await service.releaseResendClaim('whmsg_1', claimStamp, 'FAILED' as never);
      // The stamp guard: a delayed rollback must not undo a SUCCESSOR's claim
      // (settle bumps updatedAt, a new claim writes its own stamp — either
      // way this WHERE no longer matches).
      expect(prisma.outboundMessage.updateMany).toHaveBeenCalledWith({
        where: { id: 'whmsg_1', status: 'PENDING', updatedAt: claimStamp },
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
