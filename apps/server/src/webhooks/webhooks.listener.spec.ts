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
  let listener: WebhooksListener;

  beforeEach(() => {
    queue = { addBulk: jest.fn() };
    prisma = {
      webhook: { findMany: jest.fn() },
      bizEvent: { findMany: jest.fn() },
    };
    listener = new WebhooksListener(queue as any, prisma as any);
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
    expect(job.opts).toMatchObject({ attempts: 5, backoff: { type: 'exponential', delay: 1000 } });
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
