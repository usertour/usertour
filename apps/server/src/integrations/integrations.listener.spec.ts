import { IntegrationsListener } from './integrations.listener';

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

describe('IntegrationsListener', () => {
  let queue: { addBulk: jest.Mock };
  let prisma: {
    integration: { findMany: jest.Mock };
    bizEvent: { findMany: jest.Mock };
  };
  let integrationsService: { isEntitled: jest.Mock };
  let ledger: { createMessages: jest.Mock };
  let listener: IntegrationsListener;

  beforeEach(() => {
    queue = { addBulk: jest.fn() };
    prisma = {
      integration: { findMany: jest.fn() },
      bizEvent: { findMany: jest.fn() },
    };
    integrationsService = { isEntitled: jest.fn().mockResolvedValue(true) };
    ledger = {
      createMessages: jest
        .fn()
        .mockImplementation(async (inputs: Array<{ id: string }>) =>
          inputs.map((input) => input.id),
        ),
    };
    listener = new IntegrationsListener(
      queue as any,
      prisma as any,
      integrationsService as any,
      ledger as any,
    );
  });

  it('writes a ledger row per job before enqueueing, with the same id/topic/payload', async () => {
    prisma.integration.findMany.mockResolvedValue([{ id: 'int_1' }]);
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
      destination: { integrationId: 'int_1' },
      topic: 'event.tracked.flow_started',
      payload: jobs[0].data.payload,
    });
    // The envelope carries the EVENT time and the v2 event object.
    expect(jobs[0].data.payload.createdAt).toBe('2026-07-16T08:00:00.000Z');
    expect(jobs[0].data.payload.data.event.codeName).toBe('flow_started');
    expect(jobs[0].data.payload.data.event.userId).toBe('user-ext-1');
    expect(jobs[0].data.payload.id).toMatch(/^imsg_[0-9a-f]{24}$/);
  });

  it('fans out (event x integration) with a distinct message per destination', async () => {
    prisma.integration.findMany.mockResolvedValue([{ id: 'int_1' }, { id: 'int_2' }]);
    prisma.bizEvent.findMany.mockResolvedValue([
      buildBizEvent('flow_started'),
      buildBizEvent('flow_completed'),
    ]);

    await listener.onBizEventTracked({
      environmentId: 'env_1',
      bizEventIds: ['be_flow_started', 'be_flow_completed'],
    });

    const jobs = queue.addBulk.mock.calls[0][0];
    expect(jobs).toHaveLength(4);
    const messageIds = jobs.map((job: any) => job.data.messageId);
    expect(new Set(messageIds).size).toBe(4);
  });

  it('enqueues nothing when the project is no longer entitled to integrations', async () => {
    prisma.integration.findMany.mockResolvedValue([{ id: 'int_1' }]);
    integrationsService.isEntitled.mockResolvedValue(false);

    await listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_flow_started'] });

    expect(prisma.bizEvent.findMany).not.toHaveBeenCalled();
    expect(queue.addBulk).not.toHaveBeenCalled();
    expect(ledger.createMessages).not.toHaveBeenCalled();
  });

  it('skips the entitlement lookup entirely when the environment has no enabled integrations', async () => {
    prisma.integration.findMany.mockResolvedValue([]);

    await listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_flow_started'] });

    expect(integrationsService.isEntitled).not.toHaveBeenCalled();
    expect(prisma.bizEvent.findMany).not.toHaveBeenCalled();
  });

  it('enqueues only jobs whose ledger row was persisted', async () => {
    prisma.integration.findMany.mockResolvedValue([{ id: 'int_1' }, { id: 'int_2' }]);
    prisma.bizEvent.findMany.mockResolvedValue([buildBizEvent('flow_started')]);
    // Simulate one destination deleted between the read and the write: its
    // row insert is dropped by the ledger's per-row fallback.
    ledger.createMessages.mockImplementation(async (inputs: Array<{ id: string }>) =>
      inputs.slice(0, 1).map((input) => input.id),
    );

    await listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_flow_started'] });

    const jobs = queue.addBulk.mock.calls[0][0];
    expect(jobs).toHaveLength(1);
  });

  it('swallows failures instead of propagating into the tracking path', async () => {
    prisma.integration.findMany.mockRejectedValue(new Error('db down'));

    await expect(
      listener.onBizEventTracked({ environmentId: 'env_1', bizEventIds: ['be_x'] }),
    ).resolves.toBeUndefined();
  });
});
