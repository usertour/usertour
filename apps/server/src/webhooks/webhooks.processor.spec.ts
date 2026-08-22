import { createHmac } from 'node:crypto';
import axios from 'axios';
import { WebhooksProcessor } from './webhooks.processor';
import { DelayedError } from 'bullmq';
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
  ({ data, attemptsMade, opts: { attempts }, moveToDelayed: jest.fn() }) as any;

describe('WebhooksProcessor', () => {
  let prisma: {
    webhook: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    environment?: { findUnique: jest.Mock };
    userOnProject?: { findMany: jest.Mock };
  };
  let ledger: { recordAttempt: jest.Mock; touch: jest.Mock };
  let emailService: { sendOrLog: jest.Mock };
  let audit: { record: jest.Mock };
  // Pass-through: at-rest encryption is EncryptionService's own concern.
  const encryption = { decrypt: (value: string) => value, encrypt: (value: string) => value };
  let processor: WebhooksProcessor;

  beforeEach(() => {
    mockedPost.mockReset();
    prisma = {
      webhook: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          consecutiveFailures: 1,
          failingSince: new Date(),
          environmentId: 'env_1',
          url: 'https://example.com/hook',
        }),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    ledger = {
      recordAttempt: jest.fn().mockResolvedValue(undefined),
      touch: jest.fn().mockResolvedValue(undefined),
    };
    const configService = { get: jest.fn().mockReturnValue(true) }; // private egress allowed in tests
    emailService = { sendOrLog: jest.fn().mockResolvedValue(undefined) };
    audit = { record: jest.fn() };
    processor = new WebhooksProcessor(
      prisma as any,
      configService as any,
      ledger as any,
      emailService as any,
      audit as any,
      encryption as any,
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

  it('returns silently for a DELETED endpoint (its ledger rows cascaded away)', async () => {
    prisma.webhook.findUnique.mockResolvedValue(null);
    await processor.process(buildJob(0));
    // Recording would only fail the FK: the message row died with the webhook.
    expect(ledger.recordAttempt).not.toHaveBeenCalled();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('records a final failed attempt (no send) when the endpoint is disabled', async () => {
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

  it('resets the breaker on success and counts EVERY failed attempt', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });

    // A non-final failed attempt already feeds the breaker (attempt-level
    // counting: with the ~24h ladder, waiting for FINAL failures would make
    // the breaker a day late), bound to the URL this delivery actually hit.
    mockedPost.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(processor.process(buildJob(0, 8))).rejects.toThrow();
    expect(prisma.webhook.updateMany).toHaveBeenCalledWith({
      where: { id: 'wh_1', url: 'https://example.com/hook' },
      data: { consecutiveFailures: { increment: 1 } },
    });
    expect(prisma.webhook.updateMany).toHaveBeenCalledTimes(1);

    // Success: guarded reset, also bound to the delivered URL.
    mockedPost.mockResolvedValue({ status: 200, data: '' });
    await processor.process(buildJob(0, 5));
    expect(prisma.webhook.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'wh_1',
        url: 'https://example.com/hook',
        OR: [
          { consecutiveFailures: { gt: 0 } },
          { failingSince: { not: null } },
          { cooldownUntil: { not: null } },
        ],
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

    // Streak 10 (threshold) -> 1min window; streak 12 -> 4min window.
    for (const [streak, expectedMs] of [
      [10, 60_000],
      [12, 240_000],
    ] as const) {
      prisma.webhook.findUniqueOrThrow.mockResolvedValueOnce({
        consecutiveFailures: streak,
        failingSince: new Date(),
        environmentId: 'env_1',
        url: 'https://example.com/hook',
      });
      const before = Date.now();
      await expect(processor.process(buildJob(4, 5))).rejects.toThrow();
      const cooldownWrite = prisma.webhook.updateMany.mock.calls.at(-1)?.[0];
      expect(cooldownWrite.where).toEqual({ id: 'wh_1', consecutiveFailures: streak });
      expect(cooldownWrite.data.cooldownUntil).toBeInstanceOf(Date);
      const windowMs = cooldownWrite.data.cooldownUntil.getTime() - before;
      expect(windowMs).toBeGreaterThanOrEqual(expectedMs - 1000);
      expect(windowMs).toBeLessThanOrEqual(expectedMs + 1000);
      prisma.webhook.findUniqueOrThrow.mockClear();
      prisma.webhook.updateMany.mockClear();
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
    prisma.webhook.findUniqueOrThrow.mockResolvedValueOnce({
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
      encryption as any,
    );
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'http://127.0.0.1:4747/hook',
      secret: 'whsec_test',
    });

    await processor.process(buildJob(0));

    expect(prisma.webhook.updateMany).toHaveBeenCalledWith(
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
    prisma.webhook.findUniqueOrThrow.mockResolvedValueOnce({
      consecutiveFailures: 40,
      failingSince: eightDaysAgo,
      environmentId: 'env_1',
      url: 'https://example.com/hook',
    });
    prisma.environment = {
      findUnique: jest.fn().mockResolvedValue({ projectId: 'proj_1', project: { name: 'Acme' } }),
    } as any;
    prisma.userOnProject = {
      findMany: jest.fn().mockResolvedValue([{ user: { email: 'owner@acme.test' } }]),
    } as any;

    await expect(processor.process(buildJob(4, 5))).rejects.toThrow();

    expect(prisma.webhook.updateMany).toHaveBeenCalledWith({
      where: { id: 'wh_1', enabled: true, failingSince: eightDaysAgo },
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
    // Disabled means no further cooldown write: increment + disable only.
    expect(prisma.webhook.updateMany).toHaveBeenCalledTimes(2);
  });

  it('a lost auto-disable race still arms the (self-guarded) cooldown', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    mockedPost.mockRejectedValue(new Error('ECONNREFUSED'));
    prisma.webhook.findUniqueOrThrow.mockResolvedValueOnce({
      consecutiveFailures: 40,
      failingSince: new Date(Date.now() - 8 * 86_400_000),
      environmentId: 'env_1',
      url: 'https://example.com/hook',
    });
    // increment succeeds; the guarded auto-disable flip loses (state moved);
    // the cooldown arm then still runs (its own streak guard decides).
    prisma.webhook.updateMany
      .mockResolvedValueOnce({ count: 1 }) // increment
      .mockResolvedValueOnce({ count: 0 }) // auto-disable CAS miss
      .mockResolvedValueOnce({ count: 1 }); // cooldown arm

    await expect(processor.process(buildJob(4, 5))).rejects.toThrow();

    const cooldownWrite = prisma.webhook.updateMany.mock.calls.at(-1)?.[0];
    expect(cooldownWrite.where).toEqual({ id: 'wh_1', consecutiveFailures: 40 });
    expect(cooldownWrite.data.cooldownUntil).toBeInstanceOf(Date);
    // The endpoint was NOT left at full speed with nothing armed.
    expect(emailService.sendOrLog).not.toHaveBeenCalled();
  });

  it('defers (moveToDelayed, no attempt) while the endpoint is cooling down', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
      cooldownUntil: new Date(Date.now() + 10 * 60_000),
    });
    const job = buildJob(0, 8);

    await expect(processor.process(job, 'worker-token')).rejects.toThrow(DelayedError);

    // Deferred to after the window (plus release jitter), consuming nothing:
    // no socket, no ledger row, no breaker write.
    const [resumeAt, token] = job.moveToDelayed.mock.calls[0];
    expect(resumeAt).toBeGreaterThanOrEqual(Date.now() + 10 * 60_000 - 1000);
    expect(token).toBe('worker-token');
    expect(mockedPost).not.toHaveBeenCalled();
    expect(ledger.recordAttempt).not.toHaveBeenCalled();
    expect(prisma.webhook.updateMany).not.toHaveBeenCalled();
    // ...except the heartbeat: the parked message must stay visible to the
    // reconcile sweep as alive, or a long defer chain reads as an orphan.
    expect(ledger.touch).toHaveBeenCalledWith('whmsg_1');
  });

  it('lets a manual send (test event / resend) through the cooldown gate as the probe', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
      cooldownUntil: new Date(Date.now() + 10 * 60_000),
    });
    mockedPost.mockResolvedValue({ status: 200, data: '' });
    const job = buildJob(0, 1, { ...jobData, manual: true });

    await processor.process(job, 'worker-token');

    expect(job.moveToDelayed).not.toHaveBeenCalled();
    expect(mockedPost).toHaveBeenCalledTimes(1);
    // The probe's success resets the breaker for everything that is waiting.
    expect(prisma.webhook.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { consecutiveFailures: 0, cooldownUntil: null, failingSince: null },
      }),
    );
  });

  it('honors Retry-After only from 429/503 — the statuses RFC 9110 defines it for', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    for (const status of [429, 503]) {
      const failure = Object.assign(new Error(`status ${status}`), {
        response: { status, data: '', headers: { 'retry-after': '120' } },
      });
      mockedPost.mockRejectedValueOnce(failure);
      await expect(processor.process(buildJob(0, 8))).rejects.toMatchObject({
        retryAfterMs: 120_000,
      });
    }
    // A misbehaving intermediary stamping Retry-After on every 5xx must not
    // stretch each ladder rung to the 12h cap.
    const serverError = Object.assign(new Error('status 500'), {
      response: { status: 500, data: '', headers: { 'retry-after': '86400' } },
    });
    mockedPost.mockRejectedValueOnce(serverError);
    const thrown = await processor.process(buildJob(0, 8)).catch((error) => error);
    expect(thrown.retryAfterMs).toBeUndefined();
  });

  it('disables env-var proxying while the egress guard is active (SSRF)', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    mockedPost.mockResolvedValue({ status: 200, data: '' });

    // Guarded mode: proxy MUST be false — otherwise axios honors
    // HTTP(S)_PROXY env vars, dials the proxy, and the guard vets the wrong
    // host while the proxy resolves the target.
    const guardedConfig = { get: jest.fn().mockReturnValue(false) };
    processor = new WebhooksProcessor(
      prisma as any,
      guardedConfig as any,
      ledger as any,
      emailService as any,
      audit as any,
      encryption as any,
    );
    await processor.process(buildJob(0));
    expect(mockedPost.mock.calls[0][2]).toMatchObject({ proxy: false });

    // Opted-out mode (ALLOW_PRIVATE_NETWORK_EGRESS, the suite default): axios
    // defaults stand, so proxy-dependent self-hosted deployments keep working.
    const allowConfig = { get: jest.fn().mockReturnValue(true) };
    processor = new WebhooksProcessor(
      prisma as any,
      allowConfig as any,
      ledger as any,
      emailService as any,
      audit as any,
      encryption as any,
    );
    await processor.process(buildJob(0));
    expect(mockedPost.mock.calls[1][2]).not.toHaveProperty('proxy');
  });

  it('an undecryptable secret settles the message FAILED instead of looping unrecorded', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'not-decryptable',
    });
    const brokenEncryption = { decrypt: () => null, encrypt: (value: string) => value };
    processor = new WebhooksProcessor(
      prisma as any,
      { get: jest.fn().mockReturnValue(true) } as any,
      ledger as any,
      emailService as any,
      audit as any,
      brokenEncryption as any,
    );

    await processor.process(buildJob(0, 8));

    // Signing with null would throw BEFORE recordAttempt — the ladder would
    // burn with zero ledger rows and the sweep would re-queue forever.
    expect(mockedPost).not.toHaveBeenCalled();
    expect(ledger.recordAttempt).toHaveBeenCalledWith(
      'whmsg_1',
      expect.objectContaining({
        success: false,
        final: true,
        error: expect.stringContaining('rotate'),
      }),
    );
    // Counts toward the breaker: auto-disable + owner email is the signal.
    expect(prisma.webhook.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { consecutiveFailures: { increment: 1 } } }),
    );
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
      encryption as any,
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
