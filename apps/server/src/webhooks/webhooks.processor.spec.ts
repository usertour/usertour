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
  let prisma: { webhook: { findUnique: jest.Mock } };
  let ledger: { recordAttempt: jest.Mock };
  let processor: WebhooksProcessor;

  beforeEach(() => {
    mockedPost.mockReset();
    prisma = { webhook: { findUnique: jest.fn() } };
    ledger = { recordAttempt: jest.fn().mockResolvedValue(undefined) };
    const configService = { get: jest.fn().mockReturnValue(true) }; // private egress allowed in tests
    processor = new WebhooksProcessor(prisma as any, configService as any, ledger as any);
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

  it('silently completes when the endpoint row is gone or disabled', async () => {
    prisma.webhook.findUnique.mockResolvedValue(null);
    await processor.process(buildJob(0));

    prisma.webhook.findUnique.mockResolvedValue({ id: 'wh_1', enabled: false });
    await processor.process(buildJob(0));

    expect(mockedPost).not.toHaveBeenCalled();
    expect(ledger.recordAttempt).not.toHaveBeenCalled();
  });
});
