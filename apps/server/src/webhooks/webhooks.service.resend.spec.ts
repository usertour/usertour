import { ValidationError, WebhookNotFoundError } from '@/common/errors';
import { WebhooksService } from './webhooks.service';

/**
 * resendMessage's compensation path. enqueue -> add() throwing is AMBIGUOUS
 * (the connection can drop after Redis persisted the job), so the service
 * verifies by jobId before rolling the claim back; the rollback itself is
 * bound to this claim's generation stamp. These interleavings can't be driven
 * from the e2e suite (a real queue add doesn't fail on demand), hence the
 * focused unit spec.
 */
describe('WebhooksService.resendMessage — ambiguous enqueue compensation', () => {
  const claimStamp = new Date('2026-08-19T10:00:01.000Z');
  const messageUpdatedAt = new Date('2026-08-19T10:00:00.000Z');

  let prisma: {
    webhook: { findUnique: jest.Mock };
    environment: { findUnique: jest.Mock };
  };
  let projectsService: { getProjectConfig: jest.Mock };
  let ledger: {
    getMessage: jest.Mock;
    claimForResend: jest.Mock;
    releaseResendClaim: jest.Mock;
    createMessages: jest.Mock;
    recordAttempt: jest.Mock;
  };
  let deliveryQueue: { add: jest.Mock; getJob: jest.Mock };
  let service: WebhooksService;

  beforeEach(() => {
    prisma = {
      webhook: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'wh_1', enabled: true, environmentId: 'env_1' }),
      },
      environment: { findUnique: jest.fn().mockResolvedValue({ projectId: 'proj_1' }) },
    };
    projectsService = { getProjectConfig: jest.fn().mockResolvedValue({ webhooks: true }) };
    ledger = {
      getMessage: jest.fn().mockResolvedValue({
        id: 'whmsg_1',
        webhookId: 'wh_1',
        status: 'FAILED',
        topic: 'user.created',
        payload: { id: 'whmsg_1' },
        updatedAt: messageUpdatedAt,
        // Three rows, max attempt 2 (a settle retry duplicated attempt 2):
        // the offset must follow max(attempt), not the row count.
        deliveries: [{ attempt: 1 }, { attempt: 2 }, { attempt: 2 }],
      }),
      claimForResend: jest.fn().mockResolvedValue(claimStamp),
      releaseResendClaim: jest.fn().mockResolvedValue(undefined),
      createMessages: jest
        .fn()
        .mockImplementation(async (inputs: Array<{ id: string }>) =>
          inputs.map((input) => input.id),
        ),
      recordAttempt: jest.fn().mockResolvedValue(undefined),
    };
    deliveryQueue = { add: jest.fn().mockResolvedValue({}), getJob: jest.fn() };
    service = new WebhooksService(
      prisma as never,
      { get: jest.fn() } as never,
      projectsService as never,
      ledger as never,
      { decrypt: (value: string) => value, encrypt: (value: string) => value } as never,
      deliveryQueue as never,
    );
  });

  it('derives the jobId from the claim stamp and claims against the read updatedAt', async () => {
    await service.resendMessage('wh_1', 'whmsg_1');
    expect(ledger.claimForResend).toHaveBeenCalledWith('whmsg_1', messageUpdatedAt);
    expect(deliveryQueue.add).toHaveBeenCalledWith(
      'deliver',
      expect.objectContaining({ messageId: 'whmsg_1', attemptOffset: 2 }),
      expect.objectContaining({ jobId: `resend-whmsg_1-${claimStamp.getTime()}` }),
    );
    expect(ledger.releaseResendClaim).not.toHaveBeenCalled();
  });

  it('keeps the claim when add() threw but the job actually exists (phantom)', async () => {
    deliveryQueue.add.mockRejectedValue(new Error('connection reset'));
    deliveryQueue.getJob.mockResolvedValue({ id: `resend-whmsg_1-${claimStamp.getTime()}` });

    const result = await service.resendMessage('wh_1', 'whmsg_1');

    expect(result.status).toBe('PENDING');
    expect(deliveryQueue.getJob).toHaveBeenCalledWith(`resend-whmsg_1-${claimStamp.getTime()}`);
    expect(ledger.releaseResendClaim).not.toHaveBeenCalled();
  });

  it('rolls back OWN claim (stamp-bound) on a verified enqueue miss and rethrows', async () => {
    deliveryQueue.add.mockRejectedValue(new Error('queue down'));
    deliveryQueue.getJob.mockResolvedValue(null);

    await expect(service.resendMessage('wh_1', 'whmsg_1')).rejects.toThrow('queue down');
    expect(ledger.releaseResendClaim).toHaveBeenCalledWith('whmsg_1', claimStamp, 'FAILED');
  });

  it('rolls back and rethrows the ORIGINAL error when the verify itself is unreachable', async () => {
    deliveryQueue.add.mockRejectedValue(new Error('queue down'));
    deliveryQueue.getJob.mockRejectedValue(new Error('redis unreachable'));

    await expect(service.resendMessage('wh_1', 'whmsg_1')).rejects.toThrow('queue down');
    expect(ledger.releaseResendClaim).toHaveBeenCalledWith('whmsg_1', claimStamp, 'FAILED');
  });

  describe('sendTestEvent — same ambiguous-enqueue discipline', () => {
    it('settles the message FAILED on a verified enqueue miss (no 14h-late ghost test event)', async () => {
      deliveryQueue.add.mockRejectedValue(new Error('queue down'));
      deliveryQueue.getJob.mockResolvedValue(null);

      await expect(service.sendTestEvent('wh_1')).rejects.toThrow('queue down');
      // The user just watched this fail — the row must not sit PENDING for
      // the reconcile sweep to deliver hours later.
      expect(ledger.recordAttempt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ success: false, final: true }),
      );
    });

    it('labels a persisted-write failure honestly: 404 only when the webhook is gone', async () => {
      ledger.createMessages.mockResolvedValue([]); // ledger swallowed the cause
      // Recheck finds the webhook still there -> NOT a 404 (ValidationError's
      // message lives in messageDict, so match on the class).
      await expect(service.sendTestEvent('wh_1')).rejects.toBeInstanceOf(ValidationError);

      // Recheck finds it deleted -> the concurrent-delete 404.
      prisma.webhook.findUnique
        .mockResolvedValueOnce({ id: 'wh_1', enabled: true, environmentId: 'env_1' })
        .mockResolvedValueOnce(null);
      await expect(service.sendTestEvent('wh_1')).rejects.toThrow(WebhookNotFoundError);
    });

    it('keeps the message PENDING when the job actually exists (phantom)', async () => {
      deliveryQueue.add.mockRejectedValue(new Error('connection reset'));
      deliveryQueue.getJob.mockResolvedValue({ id: 'test-whmsg_x' });

      await expect(service.sendTestEvent('wh_1')).resolves.toBeDefined();
      expect(ledger.recordAttempt).not.toHaveBeenCalled();
    });
  });
});
