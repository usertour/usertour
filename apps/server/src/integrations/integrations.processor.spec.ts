import axios from 'axios';
import { DelayedError } from 'bullmq';
import { IntegrationsProcessor } from './integrations.processor';
import { IntegrationDeliveryJobData, IntegrationMessageEnvelope } from './integrations.types';

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const mockedPost = (axios as unknown as { post: jest.Mock }).post;

const envelope: IntegrationMessageEnvelope = {
  id: 'imsg_1',
  object: 'integrationMessage',
  type: 'event.tracked.flow_started',
  createdAt: '2026-07-16T08:00:00.000Z',
  environmentId: 'env_1',
  data: {
    event: {
      id: 'be_1',
      object: 'event',
      codeName: 'flow_started',
      eventDefinitionId: 'evt_def_1',
      createdAt: '2026-07-16T08:00:00.000Z',
      userId: 'user-ext-1',
      attributes: { flow_id: 'f1' },
    },
  },
};

const jobData: IntegrationDeliveryJobData = {
  integrationId: 'int_1',
  messageId: 'imsg_1',
  topic: 'event.tracked.flow_started',
  payload: envelope,
};

const buildJob = (attemptsMade = 0, attempts = 5, data: IntegrationDeliveryJobData = jobData) =>
  ({ data, attemptsMade, opts: { attempts }, moveToDelayed: jest.fn() }) as any;

const integrationRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'int_1',
  enabled: true,
  provider: 'posthog',
  key: 'stored-ciphertext',
  config: {},
  cooldownUntil: null,
  ...overrides,
});

describe('IntegrationsProcessor', () => {
  let prisma: {
    integration: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      updateMany: jest.Mock;
    };
    environment?: { findUnique: jest.Mock };
    userOnProject?: { findMany: jest.Mock };
  };
  let ledger: { recordAttempt: jest.Mock; touch: jest.Mock };
  let emailService: { sendOrLog: jest.Mock };
  let audit: { record: jest.Mock };
  // "Decryption" maps the stored ciphertext to a plaintext key; null = broken.
  let decrypt: jest.Mock;
  let processor: IntegrationsProcessor;

  beforeEach(() => {
    mockedPost.mockReset();
    prisma = {
      integration: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          consecutiveFailures: 1,
          failingSince: new Date(),
          environmentId: 'env_1',
          provider: 'posthog',
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    ledger = {
      recordAttempt: jest.fn().mockResolvedValue(undefined),
      touch: jest.fn().mockResolvedValue(undefined),
    };
    const configService = { get: jest.fn().mockReturnValue('https://app.usertour.local') };
    emailService = { sendOrLog: jest.fn().mockResolvedValue(undefined) };
    audit = { record: jest.fn() };
    decrypt = jest.fn().mockReturnValue('ph-key');
    processor = new IntegrationsProcessor(
      prisma as any,
      configService as any,
      ledger as any,
      emailService as any,
      audit as any,
      { decrypt } as any,
    );
  });

  it('POSTs the adapter-built request and records a successful attempt', async () => {
    prisma.integration.findUnique.mockResolvedValue(integrationRow());
    mockedPost.mockResolvedValue({ status: 200, data: '{"status":1}' });

    await processor.process(buildJob(0));

    expect(decrypt).toHaveBeenCalledWith('stored-ciphertext');
    const [url, body, config] = mockedPost.mock.calls[0];
    expect(url).toBe('https://us.i.posthog.com/i/v0/e/');
    expect(body).toMatchObject({ api_key: 'ph-key', event: 'flow_started' });
    // Raw response text is requested so the ledger stores bytes as received.
    expect(config.responseType).toBe('text');
    expect(config.maxRedirects).toBe(0);
    expect(ledger.recordAttempt).toHaveBeenCalledWith(
      'imsg_1',
      expect.objectContaining({ attempt: 1, success: true, responseStatus: 200 }),
    );
    // A delivered attempt clears breaker state, guarded on the stored key.
    expect(prisma.integration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'int_1', key: 'stored-ciphertext' }),
        data: { consecutiveFailures: 0, cooldownUntil: null, failingSince: null },
      }),
    );
  });

  it('records the failure, feeds the breaker, and rethrows so BullMQ retries', async () => {
    prisma.integration.findUnique.mockResolvedValue(integrationRow());
    const failure = Object.assign(new Error('Request failed with status code 500'), {
      response: { status: 500, data: 'boom', headers: {} },
    });
    mockedPost.mockRejectedValue(failure);

    await expect(processor.process(buildJob(0))).rejects.toBe(failure);

    expect(ledger.recordAttempt).toHaveBeenCalledWith(
      'imsg_1',
      expect.objectContaining({ attempt: 1, success: false, responseStatus: 500, final: false }),
    );
    // The streak increment is guarded on the delivered credential.
    expect(prisma.integration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'int_1', key: 'stored-ciphertext' },
        data: { consecutiveFailures: { increment: 1 } },
      }),
    );
  });

  it('carries a 429 Retry-After to the backoff strategy; other statuses do not', async () => {
    prisma.integration.findUnique.mockResolvedValue(integrationRow());
    const rateLimited = Object.assign(new Error('429'), {
      response: { status: 429, data: '', headers: { 'retry-after': '120' } },
    });
    mockedPost.mockRejectedValue(rateLimited);
    await expect(processor.process(buildJob(0))).rejects.toBe(rateLimited);
    expect((rateLimited as { retryAfterMs?: number }).retryAfterMs).toBe(120_000);

    prisma.integration.findUnique.mockResolvedValue(integrationRow());
    const serverError = Object.assign(new Error('500'), {
      response: { status: 500, data: '', headers: { 'retry-after': '120' } },
    });
    mockedPost.mockRejectedValue(serverError);
    await expect(processor.process(buildJob(0))).rejects.toBe(serverError);
    expect((serverError as { retryAfterMs?: number }).retryAfterMs).toBeUndefined();
  });

  it('returns silently when the integration was deleted (rows cascaded away)', async () => {
    prisma.integration.findUnique.mockResolvedValue(null);

    await processor.process(buildJob(0));

    expect(mockedPost).not.toHaveBeenCalled();
    expect(ledger.recordAttempt).not.toHaveBeenCalled();
  });

  it('settles a disabled integration as a final failed attempt', async () => {
    prisma.integration.findUnique.mockResolvedValue(integrationRow({ enabled: false }));

    await processor.process(buildJob(2));

    expect(mockedPost).not.toHaveBeenCalled();
    expect(ledger.recordAttempt).toHaveBeenCalledWith(
      'imsg_1',
      expect.objectContaining({ attempt: 3, success: false, final: true }),
    );
  });

  it('defers (not drops) while the cooldown window is open — with a reconcile heartbeat', async () => {
    prisma.integration.findUnique.mockResolvedValue(
      integrationRow({ cooldownUntil: new Date(Date.now() + 60_000) }),
    );
    const job = buildJob(0);

    await expect(processor.process(job, 'tok')).rejects.toBeInstanceOf(DelayedError);

    expect(ledger.touch).toHaveBeenCalledWith('imsg_1');
    expect(job.moveToDelayed).toHaveBeenCalled();
    expect(mockedPost).not.toHaveBeenCalled();
    expect(ledger.recordAttempt).not.toHaveBeenCalled();
  });

  it('a manual send passes through the cooldown gate (the user is the probe)', async () => {
    prisma.integration.findUnique.mockResolvedValue(
      integrationRow({ cooldownUntil: new Date(Date.now() + 60_000) }),
    );
    mockedPost.mockResolvedValue({ status: 200, data: 'ok' });

    await processor.process(buildJob(0, 1, { ...jobData, manual: true }));

    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it('an undecryptable key settles final-failed and feeds the breaker (no ghost ladder)', async () => {
    prisma.integration.findUnique.mockResolvedValue(integrationRow());
    decrypt.mockReturnValue(null);

    await processor.process(buildJob(0));

    expect(mockedPost).not.toHaveBeenCalled();
    expect(ledger.recordAttempt).toHaveBeenCalledWith(
      'imsg_1',
      expect.objectContaining({ success: false, final: true, error: expect.stringContaining('') }),
    );
    expect(prisma.integration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'int_1', key: 'stored-ciphertext' },
        data: { consecutiveFailures: { increment: 1 } },
      }),
    );
  });

  it('a provider with no adapter settles final-failed without touching the breaker', async () => {
    prisma.integration.findUnique.mockResolvedValue(integrationRow({ provider: 'salesforce' }));

    await processor.process(buildJob(0));

    expect(mockedPost).not.toHaveBeenCalled();
    expect(ledger.recordAttempt).toHaveBeenCalledWith(
      'imsg_1',
      expect.objectContaining({
        success: false,
        final: true,
        error: expect.stringContaining('salesforce'),
      }),
    );
  });

  it('continues attempt numbering from the offset (reconcile continuation)', async () => {
    prisma.integration.findUnique.mockResolvedValue(integrationRow());
    mockedPost.mockResolvedValue({ status: 200, data: 'ok' });

    await processor.process(buildJob(1, 5, { ...jobData, attemptOffset: 3 }));

    expect(ledger.recordAttempt).toHaveBeenCalledWith(
      'imsg_1',
      expect.objectContaining({ attempt: 5 }),
    );
  });
});
