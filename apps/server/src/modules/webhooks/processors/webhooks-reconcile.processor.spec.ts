import {
  RECONCILE_BATCH_SIZE,
  RECONCILE_ORPHAN_AFTER_MS,
  rebuildAttemptBudget,
} from '@/outbound/delivery-backoff';
import { WebhooksReconcileProcessor } from './webhooks-reconcile.processor';

describe('WebhooksReconcileProcessor', () => {
  const claimStamp = new Date('2026-08-20T10:00:00.000Z');
  const orphan = {
    id: 'whmsg_orphan',
    webhookId: 'wh_1',
    topic: 'user.created',
    payload: { id: 'whmsg_orphan' },
    updatedAt: new Date('2026-08-19T00:00:00.000Z'),
    // Four ROWS but max attempt 3: a settle-retry duplicated attempt 2 —
    // continuation math must follow max(attempt), not the row count.
    deliveries: [
      { success: false, attempt: 1 },
      { success: false, attempt: 2 },
      { success: false, attempt: 2 },
      { success: false, attempt: 3 },
    ],
  };

  let ledger: {
    findOrphanedPendingMessages: jest.Mock;
    claimForReconcile: jest.Mock;
  };
  let deliveryQueue: { add: jest.Mock };
  let processor: WebhooksReconcileProcessor;

  beforeEach(() => {
    ledger = {
      findOrphanedPendingMessages: jest.fn().mockResolvedValue([orphan]),
      claimForReconcile: jest.fn().mockResolvedValue(claimStamp),
    };
    deliveryQueue = { add: jest.fn().mockResolvedValue({}) };
    processor = new WebhooksReconcileProcessor(
      {} as never, // reconcile queue only used by onModuleInit scheduling
      deliveryQueue as never,
      ledger as never,
    );
  });

  it('re-queues a claimed orphan as a continuation of its logged attempts', async () => {
    await processor.process({} as never);

    // The sweep looks back past the largest ladder gap and claims via CAS.
    const [side, cutoff, take] = ledger.findOrphanedPendingMessages.mock.calls[0];
    expect(side).toBe('webhook');
    expect(Date.now() - cutoff.getTime()).toBeGreaterThanOrEqual(RECONCILE_ORPHAN_AFTER_MS - 1000);
    expect(take).toBe(RECONCILE_BATCH_SIZE);
    expect(ledger.claimForReconcile).toHaveBeenCalledWith('whmsg_orphan', orphan.updatedAt);

    expect(deliveryQueue.add).toHaveBeenCalledWith(
      'deliver',
      expect.objectContaining({
        webhookId: 'wh_1',
        messageId: 'whmsg_orphan',
        // max(attempt)=3 despite 4 rows (duplicate attempt 2 in the fixture).
        attemptOffset: 3,
      }),
      expect.objectContaining({
        // Remaining budget, not a fresh one; generation-keyed jobId.
        attempts: 5,
        backoff: { type: 'custom' },
        jobId: `reconcile-whmsg_orphan-${claimStamp.getTime()}`,
      }),
    );
  });

  it('skips an orphan whose claim was lost (job alive / concurrent sweep)', async () => {
    ledger.claimForReconcile.mockResolvedValue(null);

    await processor.process({} as never);

    expect(deliveryQueue.add).not.toHaveBeenCalled();
  });

  it('keeps at least one attempt when the logged tries already exhaust the budget', async () => {
    ledger.findOrphanedPendingMessages.mockResolvedValue([
      {
        ...orphan,
        deliveries: new Array(9)
          .fill(null)
          .map((_, index) => ({ success: false, attempt: index + 1 })),
      },
    ]);

    await processor.process({} as never);

    expect(deliveryQueue.add).toHaveBeenCalledWith(
      'deliver',
      expect.anything(),
      expect.objectContaining({ attempts: 1 }),
    );
  });

  it('rebuilds a single-attempt budget for manual sends (probe semantics preserved)', async () => {
    // Test event: always a one-shot probe, even with zero logged tries.
    expect(rebuildAttemptBudget('webhook.test', ['webhook.test'], [], 0)).toBe(1);
    // Resend of a DELIVERED message: PENDING can only mean a single-attempt
    // resend was in flight — not a fresh 7-attempt ladder.
    expect(rebuildAttemptBudget('user.created', ['webhook.test'], [{ success: true }], 1)).toBe(1);
    // Resend of a FAILED message: the remainder already lands on 1.
    expect(
      rebuildAttemptBudget(
        'user.created',
        ['webhook.test'],
        new Array(8).fill({ success: false }),
        8,
      ),
    ).toBe(1);
    // Listener-born orphan mid-ladder: continues its remaining budget.
    expect(
      rebuildAttemptBudget(
        'user.created',
        ['webhook.test'],
        new Array(3).fill({ success: false }),
        3,
      ),
    ).toBe(5);
  });

  it('rebuilds WITHOUT the manual flag — an hours-old orphan respects the cooldown gate', async () => {
    ledger.findOrphanedPendingMessages.mockResolvedValue([
      { ...orphan, topic: 'webhook.test', deliveries: [] },
    ]);

    await processor.process({} as never);

    const [, jobData, opts] = deliveryQueue.add.mock.calls[0];
    expect(jobData).not.toHaveProperty('manual');
    expect(opts).toMatchObject({ attempts: 1 });
  });

  it('an enqueue failure leaves the claim alone and continues the sweep', async () => {
    const second = { ...orphan, id: 'whmsg_second' };
    ledger.findOrphanedPendingMessages.mockResolvedValue([orphan, second]);
    deliveryQueue.add.mockRejectedValueOnce(new Error('redis down'));

    await expect(processor.process({} as never)).resolves.toBeUndefined();

    // First failed, second still processed; no rollback write exists at all —
    // the claim's bumped updatedAt just parks the row for one more window.
    expect(deliveryQueue.add).toHaveBeenCalledTimes(2);
  });
});
