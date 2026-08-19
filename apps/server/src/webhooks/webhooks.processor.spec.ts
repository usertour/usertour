import { createHmac } from 'node:crypto';
import axios from 'axios';
import { WebhooksProcessor } from './webhooks.processor';
import { WebhookDeliveryJobData } from './webhook.types';

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const mockedPost = (axios as unknown as { post: jest.Mock }).post;

const jobData: WebhookDeliveryJobData = {
  webhookId: 'wh_1',
  messageId: 'whmsg_1',
  topic: 'event.tracked.flow_started',
  payload: { id: 'whmsg_1', object: 'webhookMessage', type: 'event.tracked.flow_started' },
};

const buildJob = (attemptsMade = 0, attempts = 5, data: WebhookDeliveryJobData = jobData) =>
  ({ data, attemptsMade, opts: { attempts } }) as any;

describe('WebhooksProcessor', () => {
  let prisma: {
    webhook: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    environment?: { findUnique: jest.Mock };
    userOnProject?: { findMany: jest.Mock };
  };
  let ledger: { recordAttempt: jest.Mock };
  let emailService: { sendOrLog: jest.Mock };
  let audit: { record: jest.Mock };
  let processor: WebhooksProcessor;

  beforeEach(() => {
    mockedPost.mockReset();
    prisma = {
      webhook: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({
          consecutiveFailures: 1,
          failingSince: new Date(),
          environmentId: 'env_1',
          url: 'https://example.com/hook',
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    ledger = { recordAttempt: jest.fn().mockResolvedValue(undefined) };
    const configService = { get: jest.fn().mockReturnValue(true) }; // private egress allowed in tests
    emailService = { sendOrLog: jest.fn().mockResolvedValue(undefined) };
    audit = { record: jest.fn() };
    processor = new WebhooksProcessor(
      prisma as any,
      configService as any,
      ledger as any,
      emailService as any,
      audit as any,
    );
  });

  it('POSTs the signed body and records a successful delivery attempt', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    mockedPost.mockResolvedValue({ status: 200, data: '{"ok":true}' });

    await processor.process(buildJob(0));

    expect(mockedPost).toHaveBeenCalledTimes(1);
    const [url, body, config] = mockedPost.mock.calls[0];
    expect(url).toBe('https://example.com/hook');
    expect(typeof body).toBe('string');

    // The signature must verify against the exact wire body.
    const signature = config.headers['X-Usertour-Signature'] as string;
    const timestamp = signature.match(/^t=(\d+),v1=/)?.[1];
    const expectedMac = createHmac('sha256', 'whsec_test')
      .update(`${timestamp}.${body}`)
      .digest('hex');
    expect(signature).toBe(`t=${timestamp},v1=${expectedMac}`);

    // Raw response text is requested (no JSON parse) so the ledger stores bytes as received.
    expect(config.responseType).toBe('text');
    expect(ledger.recordAttempt).toHaveBeenCalledWith(
      'whmsg_1',
      expect.objectContaining({
        attempt: 1,
        success: true,
        responseStatus: 200,
        responseBody: '{"ok":true}',
        final: false,
      }),
    );
  });

  it('records the failed attempt and rethrows so BullMQ retries', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    const httpError = Object.assign(new Error('Request failed with status code 500'), {
      response: { status: 500, data: 'boom' },
    });
    mockedPost.mockRejectedValue(httpError);

    await expect(processor.process(buildJob(1))).rejects.toBe(httpError);

    expect(ledger.recordAttempt).toHaveBeenCalledWith(
      'whmsg_1',
      expect.objectContaining({
        attempt: 2,
        success: false,
        responseStatus: 500,
        responseBody: 'boom',
        error: expect.stringContaining('500'),
        final: false,
      }),
    );
  });

  it('marks the last try of the retry budget as final', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    mockedPost.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(processor.process(buildJob(4, 5))).rejects.toThrow('ECONNREFUSED');

    expect(ledger.recordAttempt).toHaveBeenCalledWith(
      'whmsg_1',
      expect.objectContaining({ attempt: 5, success: false, final: true }),
    );
  });

  it('continues attempt numbering after a resend offset', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    mockedPost.mockResolvedValue({ status: 200, data: '' });

    // A manual resend: single-attempt job after 5 logged tries.
    await processor.process(buildJob(0, 1, { ...jobData, attemptOffset: 5 }));

    expect(ledger.recordAttempt).toHaveBeenCalledWith(
      'whmsg_1',
      expect.objectContaining({ attempt: 6, success: true, responseBody: null, final: true }),
    );
  });

  it('records a final failed attempt (no send) when the endpoint is gone or disabled', async () => {
    prisma.webhook.findUnique.mockResolvedValue(null);
    await processor.process(buildJob(0));
    expect(ledger.recordAttempt).toHaveBeenLastCalledWith(
      'whmsg_1',
      expect.objectContaining({
        success: false,
        final: true,
        error: expect.stringContaining('deleted'),
      }),
    );

    prisma.webhook.findUnique.mockResolvedValue({ id: 'wh_1', enabled: false });
    await processor.process(buildJob(0));
    expect(ledger.recordAttempt).toHaveBeenLastCalledWith(
      'whmsg_1',
      expect.objectContaining({
        success: false,
        final: true,
        error: expect.stringContaining('disabled'),
      }),
    );

    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('resets the breaker on success and counts only FINAL failures', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });

    // Non-final failure: no streak bookkeeping.
    mockedPost.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(processor.process(buildJob(0, 5))).rejects.toThrow();
    expect(prisma.webhook.update).not.toHaveBeenCalled();

    // Final failure: streak +1 (below the threshold -> no cooldown write).
    await expect(processor.process(buildJob(4, 5))).rejects.toThrow();
    expect(prisma.webhook.update).toHaveBeenCalledWith({
      where: { id: 'wh_1' },
      data: { consecutiveFailures: { increment: 1 } },
      select: { consecutiveFailures: true, failingSince: true, environmentId: true, url: true },
    });
    expect(prisma.webhook.update).toHaveBeenCalledTimes(1);

    // Success: guarded reset.
    mockedPost.mockResolvedValue({ status: 200, data: '' });
    await processor.process(buildJob(0, 5));
    expect(prisma.webhook.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'wh_1',
        OR: [{ consecutiveFailures: { gt: 0 } }, { failingSince: { not: null } }],
      },
      data: { consecutiveFailures: 0, cooldownUntil: null, failingSince: null },
    });
  });

  it('arms an exponentially growing cooldown once the streak crosses the threshold', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    mockedPost.mockRejectedValue(new Error('ECONNREFUSED'));

    // Streak 5 (threshold) -> 1min window; streak 7 -> 4min window.
    for (const [streak, expectedMs] of [
      [5, 60_000],
      [7, 240_000],
    ] as const) {
      prisma.webhook.update
        .mockResolvedValueOnce({
          consecutiveFailures: streak,
          failingSince: new Date(),
          environmentId: 'env_1',
          url: 'https://example.com/hook',
        })
        .mockResolvedValueOnce({});
      const before = Date.now();
      await expect(processor.process(buildJob(4, 5))).rejects.toThrow();
      const cooldownWrite = prisma.webhook.update.mock.calls.at(-1)?.[0];
      expect(cooldownWrite.data.cooldownUntil).toBeInstanceOf(Date);
      const windowMs = cooldownWrite.data.cooldownUntil.getTime() - before;
      expect(windowMs).toBeGreaterThanOrEqual(expectedMs - 1000);
      expect(windowMs).toBeLessThanOrEqual(expectedMs + 1000);
      prisma.webhook.update.mockClear();
    }
  });

  it('does NOT auto-disable on an old failingSince stamp without an active streak', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    mockedPost.mockRejectedValue(new Error('ECONNREFUSED'));
    // Orphaned stamp scenario: streak reset raced, stamp survived. One
    // transient final failure a week later must not disable the endpoint.
    prisma.webhook.update.mockResolvedValueOnce({
      consecutiveFailures: 1,
      failingSince: new Date(Date.now() - 8 * 86_400_000),
      environmentId: 'env_1',
      url: 'https://example.com/hook',
    });

    await expect(processor.process(buildJob(4, 5))).rejects.toThrow();

    expect(prisma.webhook.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ enabled: false }) }),
    );
    expect(emailService.sendOrLog).not.toHaveBeenCalled();
  });

  it('counts an egress-policy refusal toward the breaker', async () => {
    const configService = { get: jest.fn().mockReturnValue(false) };
    processor = new WebhooksProcessor(
      prisma as any,
      configService as any,
      ledger as any,
      emailService as any,
      audit as any,
    );
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'http://127.0.0.1:4747/hook',
      secret: 'whsec_test',
    });

    await processor.process(buildJob(0));

    expect(prisma.webhook.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { consecutiveFailures: { increment: 1 } } }),
    );
  });

  it('auto-disables (audit + owner email) once the streak is older than the window', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    mockedPost.mockRejectedValue(new Error('ECONNREFUSED'));
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000);
    prisma.webhook.update.mockResolvedValueOnce({
      consecutiveFailures: 40,
      failingSince: eightDaysAgo,
      environmentId: 'env_1',
      url: 'https://example.com/hook',
    });
    prisma.webhook.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.environment = {
      findUnique: jest.fn().mockResolvedValue({ projectId: 'proj_1', project: { name: 'Acme' } }),
    } as any;
    prisma.userOnProject = {
      findMany: jest.fn().mockResolvedValue([{ user: { email: 'owner@acme.test' } }]),
    } as any;

    await expect(processor.process(buildJob(4, 5))).rejects.toThrow();

    expect(prisma.webhook.updateMany).toHaveBeenCalledWith({
      where: { id: 'wh_1', enabled: true },
      data: { enabled: false, autoDisabledAt: expect.any(Date), cooldownUntil: null },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'system',
        operation: 'autoDisableWebhook',
        resourceType: 'webhook',
        resourceId: 'wh_1',
      }),
    );
    expect(emailService.sendOrLog).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'owner@acme.test' }),
    );
    // Disabled means no further cooldown write.
    expect(prisma.webhook.update).toHaveBeenCalledTimes(1);
  });

  it('caps the response size axios may buffer', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    mockedPost.mockResolvedValue({ status: 200, data: '' });

    await processor.process(buildJob(0));

    const config = mockedPost.mock.calls[0][2];
    expect(config.maxContentLength).toBe(256 * 1024);
  });

  it('refuses a private/non-https URL when the egress switch is off (no send)', async () => {
    // configService.get returns false → default policy. A row created while
    // the switch was ON must stop delivering after it is turned off.
    const configService = { get: jest.fn().mockReturnValue(false) };
    processor = new WebhooksProcessor(
      prisma as any,
      configService as any,
      ledger as any,
      emailService as any,
      audit as any,
    );
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'http://127.0.0.1:4747/hook',
      secret: 'whsec_test',
    });

    await processor.process(buildJob(0));

    expect(mockedPost).not.toHaveBeenCalled();
    expect(ledger.recordAttempt).toHaveBeenCalledWith(
      'whmsg_1',
      expect.objectContaining({
        success: false,
        final: true,
        error: expect.stringContaining('egress policy'),
      }),
    );
  });
});
