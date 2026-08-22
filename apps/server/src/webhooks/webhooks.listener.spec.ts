import { WebhooksListener } from './webhooks.listener';

const buildBizEvent = (codeName: string, overrides: Record<string, any> = {}) => ({
  id: `be_${codeName}`,
  createdAt: new Date('2026-07-16T08:00:00.000Z'),
  eventId: `evt_def_${codeName}`,
  event: { codeName },
  bizUser: { externalId: 'user-ext-1' },
  bizCompany: null,
  bizSession: null,
  bizSessionId: null,
  contentId: null,
  versionId: null,
  data: { flow_id: 'f1' },
  ...overrides,
});

describe('WebhooksListener', () => {
  let queue: { addBulk: jest.Mock };
  let prisma: {
    webhook: { findMany: jest.Mock };
    bizEvent: { findMany: jest.Mock };
    bizUser?: { findUnique: jest.Mock };
  };
  let webhooksService: { isEntitled: jest.Mock };
  let ledger: { createMessages: jest.Mock };
  let listener: WebhooksListener;

  beforeEach(() => {
    queue = { addBulk: jest.fn() };
    prisma = {
      webhook: { findMany: jest.fn() },
      bizEvent: { findMany: jest.fn() },
    };
    webhooksService = { isEntitled: jest.fn().mockResolvedValue(true) };
    ledger = {
      createMessages: jest
        .fn()
        .mockImplementation(async (inputs: Array<{ id: string }>) =>
          inputs.map((input) => input.id),
        ),
    };
    listener = new WebhooksListener(
      queue as any,
      prisma as any,
      webhooksService as any,
      ledger as any,
    );
  });

  it('writes a ledger row per job before enqueueing, with the same id/topic/payload', async () => {
    prisma.webhook.findMany.mockResolvedValue([{ id: 'wh_1', topics: ['*'], enabled: true }]);
    prisma.bizEvent.findMany.mockResolvedValue([buildBizEvent('flow_started')]);
    const order: string[] = [];
    ledger.createMessages.mockImplementation(async (inputs: Array<{ id: string }>) => {
      order.push('ledger');
      return inputs.map((input) => input.id);
    });
    queue.addBulk.mockImplementation(async () => {
      order.push('queue');
    });

    await listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_flow_started'] });

    expect(order).toEqual(['ledger', 'queue']);
    const rows = ledger.createMessages.mock.calls[0][0];
    const jobs = queue.addBulk.mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      id: jobs[0].data.messageId,
      environmentId: 'env_1',
      destination: { webhookId: 'wh_1' },
      topic: 'event.tracked.flow_started',
      payload: jobs[0].data.payload,
    });
  });

  it('enqueues nothing when the project is no longer entitled to webhooks', async () => {
    prisma.webhook.findMany.mockResolvedValue([{ id: 'wh_1', topics: ['*'], enabled: true }]);
    webhooksService.isEntitled.mockResolvedValue(false);

    await listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_flow_started'] });
    await listener.onContentPublished({
      environmentId: 'env_1',
      contentId: 'c_1',
      versionId: 'v_1',
    });

    expect(prisma.bizEvent.findMany).not.toHaveBeenCalled();
    expect(queue.addBulk).not.toHaveBeenCalled();
  });

  it('does NOT gate on cooldown — cooling endpoints keep their ledger rows', async () => {
    prisma.webhook.findMany.mockResolvedValue([]);

    await listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_1'] });

    // Availability (the breaker) is the processor's business: it defers the
    // attempts. Gating message CREATION here would erase events instead of
    // delaying them.
    const query = prisma.webhook.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ environmentId: 'env_1', enabled: true });
    // Hot path pulls only what matching needs — not the encrypted secret or
    // the breaker columns.
    expect(query.select).toEqual({ id: true, topics: true });
  });

  it('a transient DB error on one change does not sink its batch siblings', async () => {
    prisma.webhook.findMany.mockResolvedValue([{ id: 'wh_1', topics: ['user'], enabled: true }]);
    // First change's snapshot re-read blows up; the second succeeds.
    prisma.bizUser = {
      findUnique: jest.fn().mockRejectedValueOnce(new Error('db blip')).mockResolvedValue({
        id: 'bu_2',
        externalId: 'ext_user_2',
        createdAt: new Date(),
        data: {},
      }),
    } as never;

    await listener.onEntityChanged({
      environmentId: 'env_1',
      changes: [
        { entity: 'user', action: 'updated', bizId: 'bu_1' },
        { entity: 'user', action: 'updated', bizId: 'bu_2' },
      ],
    });

    const enqueued = queue.addBulk.mock.calls[0][0];
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0].data.payload.data.user.id).toBe('ext_user_2');
  });

  it('a change outside the topic vocabulary is skipped without sinking its batch siblings', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'wh_1', topics: ['user', 'company'], enabled: true },
    ]);
    prisma.bizUser = {
      findUnique: jest.fn().mockResolvedValue({
        id: 'bu_1',
        externalId: 'ext_user_1',
        createdAt: new Date(),
        data: {},
      }),
    } as never;

    await listener.onEntityChanged({
      environmentId: 'env_1',
      changes: [
        // Future-entity change the vocabulary has never heard of (only
        // reachable once the EntityChange union widens) ...
        { entity: 'companyMembership' as never, action: 'created', bizId: 'bm_1' },
        // ... must not stop the valid sibling from delivering.
        { entity: 'user', action: 'updated', bizId: 'bu_1' },
      ],
    });

    const enqueued = queue.addBulk.mock.calls[0][0];
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0].data.topic).toBe('user.updated');
  });

  it('skips the bizEvent join when no endpoint subscribes to event-family topics', async () => {
    // Entity/content-only subscribers must not pay the 4-include read just
    // to discard every row at topic matching.
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'wh_entity', topics: ['user.created', 'content'], enabled: true },
    ]);

    await listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_1'] });

    expect(prisma.bizEvent.findMany).not.toHaveBeenCalled();
    expect(queue.addBulk).not.toHaveBeenCalled();
  });

  it('enqueues only the jobs whose ledger row was persisted (vanished webhook drops ITS rows only)', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'wh_a', topics: ['event.tracked'], enabled: true },
      { id: 'wh_b', topics: ['event.tracked'], enabled: true },
    ]);
    prisma.bizEvent.findMany.mockResolvedValue([buildBizEvent('flow_started')]);
    // wh_b was deleted between the read and the write: the ledger's per-row
    // fallback persists only wh_a's message.
    ledger.createMessages.mockImplementation(
      async (inputs: Array<{ id: string; destination: { webhookId: string } }>) =>
        inputs.filter((input) => input.destination.webhookId === 'wh_a').map((input) => input.id),
    );

    await listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_1'] });

    const enqueued = queue.addBulk.mock.calls[0][0];
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0].data.webhookId).toBe('wh_a');
  });

  it('skips the entitlement lookup when the environment has no enabled endpoints', async () => {
    prisma.webhook.findMany.mockResolvedValue([]);

    await listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_flow_started'] });

    expect(webhooksService.isEntitled).not.toHaveBeenCalled();
    expect(queue.addBulk).not.toHaveBeenCalled();
  });

  it('enqueues one job per matching (webhook x event) with the assembled payload', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'wh_1', topics: ['event.tracked'], enabled: true },
      { id: 'wh_2', topics: ['event.tracked.flow_started'], enabled: true },
    ]);
    prisma.bizEvent.findMany.mockResolvedValue([buildBizEvent('flow_started')]);

    await listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_flow_started'] });

    expect(queue.addBulk).toHaveBeenCalledTimes(1);
    const jobs = queue.addBulk.mock.calls[0][0];
    expect(jobs).toHaveLength(2);

    const job = jobs[0];
    expect(job.data.webhookId).toBe('wh_1');
    expect(job.data.topic).toBe('event.tracked.flow_started');
    expect(job.data.messageId).toMatch(/^whmsg_[0-9a-f]{32}$/);
    expect(job.data.payload).toMatchObject({
      id: job.data.messageId,
      object: 'webhookMessage',
      type: 'event.tracked.flow_started',
      environmentId: 'env_1',
      data: {
        event: {
          object: 'event',
          codeName: 'flow_started',
          eventDefinitionId: 'evt_def_flow_started',
          userId: 'user-ext-1',
          attributes: { flow_id: 'f1' },
        },
      },
    });
    expect(job.opts).toMatchObject({ attempts: 8, backoff: { type: 'custom' } });
  });

  it('skips events no endpoint subscribes to', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'wh_1', topics: ['event.tracked.flow_completed'], enabled: true },
    ]);
    prisma.bizEvent.findMany.mockResolvedValue([buildBizEvent('flow_started')]);

    await listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_flow_started'] });

    expect(queue.addBulk).not.toHaveBeenCalled();
  });

  it('does not read events at all when the environment has no enabled endpoint', async () => {
    prisma.webhook.findMany.mockResolvedValue([]);

    await listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_x'] });

    expect(prisma.bizEvent.findMany).not.toHaveBeenCalled();
    expect(queue.addBulk).not.toHaveBeenCalled();
  });

  it('excludes noisy events from namespace subscriptions but honors explicit topics', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'wh_all', topics: ['event.tracked'], enabled: true },
      { id: 'wh_pv', topics: ['event.tracked.page_viewed'], enabled: true },
    ]);
    prisma.bizEvent.findMany.mockResolvedValue([buildBizEvent('page_viewed')]);

    await listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_page_viewed'] });

    const jobs = queue.addBulk.mock.calls[0][0];
    expect(jobs).toHaveLength(1);
    expect(jobs[0].data.webhookId).toBe('wh_pv');
  });

  it('swallows enqueue failures (side-channel must not propagate)', async () => {
    prisma.webhook.findMany.mockRejectedValue(new Error('db down'));

    await expect(
      listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_x'] }),
    ).resolves.toBeUndefined();
  });

  describe('onEntityChanged', () => {
    beforeEach(() => {
      prisma.bizUser = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'bu_1',
          externalId: 'user-42',
          data: { plan: 'pro' },
          createdAt: new Date('2026-06-01T08:12:30.000Z'),
        }),
      };
    });

    it('delivers the v2 user object with previousAttributes to matching endpoints', async () => {
      prisma.webhook.findMany.mockResolvedValue([
        { id: 'wh_users', topics: ['user'], enabled: true },
        { id: 'wh_events_only', topics: ['event.tracked'], enabled: true },
      ]);

      await listener.onEntityChanged({
        environmentId: 'env_1',
        changes: [
          {
            entity: 'user',
            action: 'updated',
            bizId: 'bu_1',
            previousAttributes: { plan: 'free' },
          },
        ],
      });

      const jobs = queue.addBulk.mock.calls[0][0];
      expect(jobs).toHaveLength(1);
      expect(jobs[0].data.webhookId).toBe('wh_users');
      expect(jobs[0].data.topic).toBe('user.updated');
      expect(jobs[0].data.payload).toMatchObject({
        type: 'user.updated',
        data: {
          user: { id: 'user-42', object: 'user', attributes: { plan: 'pro' } },
          previousAttributes: { plan: 'free' },
        },
      });
    });

    it('maps a deletion from the captured row instead of re-reading', async () => {
      prisma.webhook.findMany.mockResolvedValue([{ id: 'wh_1', topics: ['user'], enabled: true }]);
      prisma.bizUser.findUnique.mockResolvedValue(null); // gone — must not be consulted

      await listener.onEntityChanged({
        environmentId: 'env_1',
        changes: [
          {
            entity: 'user',
            action: 'deleted',
            bizId: 'bu_1',
            deletedRow: {
              id: 'bu_1',
              externalId: 'user-ext-1',
              environmentId: 'env_1',
              data: { name: 'Ada' },
              createdAt: new Date('2026-07-16T08:00:00.000Z'),
              updatedAt: new Date('2026-07-16T08:00:00.000Z'),
            } as any,
          },
        ],
      });

      expect(prisma.bizUser.findUnique).not.toHaveBeenCalled();
      const jobs = queue.addBulk.mock.calls[0][0];
      expect(jobs).toHaveLength(1);
      expect(jobs[0].data.topic).toBe('user.deleted');
      expect(jobs[0].data.payload.data.user).toEqual(
        expect.objectContaining({ id: 'user-ext-1', object: 'user' }),
      );
      expect(jobs[0].data.payload.data).not.toHaveProperty('previousAttributes');
    });

    it('omits previousAttributes on created and skips vanished rows', async () => {
      prisma.webhook.findMany.mockResolvedValue([
        { id: 'wh_users', topics: ['user.created'], enabled: true },
      ]);

      await listener.onEntityChanged({
        environmentId: 'env_1',
        changes: [{ entity: 'user', action: 'created', bizId: 'bu_1' }],
      });
      const jobs = queue.addBulk.mock.calls[0][0];
      expect(jobs[0].data.payload.data.previousAttributes).toBeUndefined();

      queue.addBulk.mockClear();
      prisma.bizUser.findUnique.mockResolvedValue(null);
      await listener.onEntityChanged({
        environmentId: 'env_1',
        changes: [{ entity: 'user', action: 'created', bizId: 'bu_gone' }],
      });
      expect(queue.addBulk).not.toHaveBeenCalled();
    });
  });
});
