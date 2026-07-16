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

const buildJob = (attemptsMade = 0) => ({ data: jobData, attemptsMade }) as any;

describe('WebhooksProcessor', () => {
  let prisma: {
    webhook: { findUnique: jest.Mock };
    webhookDelivery: { create: jest.Mock };
  };
  let processor: WebhooksProcessor;

  beforeEach(() => {
    mockedPost.mockReset();
    prisma = {
      webhook: { findUnique: jest.fn() },
      webhookDelivery: { create: jest.fn().mockResolvedValue({}) },
    };
    const configService = { get: jest.fn().mockReturnValue(true) }; // private egress allowed in tests
    processor = new WebhooksProcessor(prisma as any, configService as any);
  });

  it('POSTs the signed body and records a successful delivery attempt', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    mockedPost.mockResolvedValue({ status: 200 });

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

    expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        webhookId: 'wh_1',
        messageId: 'whmsg_1',
        attempt: 1,
        success: true,
        responseStatus: 200,
      }),
    });
  });

  it('records the failed attempt and rethrows so BullMQ retries', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    const httpError = Object.assign(new Error('Request failed with status code 500'), {
      response: { status: 500 },
    });
    mockedPost.mockRejectedValue(httpError);

    await expect(processor.process(buildJob(1))).rejects.toBe(httpError);

    expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        attempt: 2,
        success: false,
        responseStatus: 500,
        error: expect.stringContaining('500'),
      }),
    });
  });

  it('silently completes when the endpoint row is gone or disabled', async () => {
    prisma.webhook.findUnique.mockResolvedValue(null);
    await processor.process(buildJob(0));

    prisma.webhook.findUnique.mockResolvedValue({ id: 'wh_1', enabled: false });
    await processor.process(buildJob(0));

    expect(mockedPost).not.toHaveBeenCalled();
    expect(prisma.webhookDelivery.create).not.toHaveBeenCalled();
  });

  it('never lets a delivery-log write failure trigger a duplicate send', async () => {
    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh_1',
      enabled: true,
      url: 'https://example.com/hook',
      secret: 'whsec_test',
    });
    mockedPost.mockResolvedValue({ status: 204 });
    prisma.webhookDelivery.create.mockRejectedValue(new Error('db blip'));

    await expect(processor.process(buildJob(0))).resolves.toBeUndefined();
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });
});
