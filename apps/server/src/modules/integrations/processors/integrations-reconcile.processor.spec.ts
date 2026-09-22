import { RECONCILE_BATCH_SIZE, RECONCILE_ORPHAN_AFTER_MS } from '@/outbound/delivery-backoff';
import { IntegrationsReconcileProcessor } from './integrations-reconcile.processor';

describe('IntegrationsReconcileProcessor', () => {
  const claimStamp = new Date('2026-08-25T10:00:00.000Z');
  const orphan = {
    id: 'imsg_orphan',
    webhookId: null,
    integrationId: 'int_1',
    topic: 'event.tracked.flow_started',
    payload: { id: 'imsg_orphan' },
    updatedAt: new Date('2026-08-24T00:00:00.000Z'),
    deliveries: [
      { success: false, attempt: 1 },
      { success: false, attempt: 2 },
    ],
  };

  let ledger: {
    findOrphanedPendingMessages: jest.Mock;
    claimForReconcile: jest.Mock;
  };
  let deliveryQueue: { add: jest.Mock };
  let processor: IntegrationsReconcileProcessor;

  beforeEach(() => {
    ledger = {
      findOrphanedPendingMessages: jest.fn().mockResolvedValue([orphan]),
      claimForReconcile: jest.fn().mockResolvedValue(claimStamp),
    };
    deliveryQueue = { add: jest.fn().mockResolvedValue({}) };
    processor = new IntegrationsReconcileProcessor(
      {} as never, // reconcile queue only used by onModuleInit scheduling
      deliveryQueue as never,
      ledger as never,
    );
  });

  it('sweeps the INTEGRATION side and re-queues a claimed orphan as a continuation', async () => {
    await processor.process({} as never);

    const [side, cutoff, take] = ledger.findOrphanedPendingMessages.mock.calls[0];
    expect(side).toBe('integration');
    expect(Date.now() - cutoff.getTime()).toBeGreaterThanOrEqual(RECONCILE_ORPHAN_AFTER_MS - 1000);
    expect(take).toBe(RECONCILE_BATCH_SIZE);
    expect(ledger.claimForReconcile).toHaveBeenCalledWith('imsg_orphan', orphan.updatedAt);

    expect(deliveryQueue.add).toHaveBeenCalledWith(
      'deliver',
      expect.objectContaining({
        integrationId: 'int_1',
        messageId: 'imsg_orphan',
        attemptOffset: 2,
      }),
      expect.objectContaining({
        attempts: 6,
        backoff: { type: 'custom' },
        jobId: `reconcile-imsg_orphan-${claimStamp.getTime()}`,
      }),
    );
    // NOT manual: an orphan swept up later respects the cooldown gate.
    expect(deliveryQueue.add.mock.calls[0][1]).not.toHaveProperty('manual');
  });

  it('rebuilds a one-shot budget for a lost test message', async () => {
    ledger.findOrphanedPendingMessages.mockResolvedValue([
      { ...orphan, topic: 'integration.test', deliveries: [] },
    ]);

    await processor.process({} as never);

    expect(deliveryQueue.add).toHaveBeenCalledWith(
      'deliver',
      expect.anything(),
      expect.objectContaining({ attempts: 1 }),
    );
  });

  it('skips an orphan whose claim was lost (job alive / concurrent sweep)', async () => {
    ledger.claimForReconcile.mockResolvedValue(null);

    await processor.process({} as never);

    expect(deliveryQueue.add).not.toHaveBeenCalled();
  });

  it('an enqueue failure leaves the claim alone and continues the sweep', async () => {
    const second = { ...orphan, id: 'imsg_second' };
    ledger.findOrphanedPendingMessages.mockResolvedValue([orphan, second]);
    deliveryQueue.add.mockRejectedValueOnce(new Error('redis down'));

    await expect(processor.process({} as never)).resolves.toBeUndefined();

    expect(deliveryQueue.add).toHaveBeenCalledTimes(2);
  });
});
