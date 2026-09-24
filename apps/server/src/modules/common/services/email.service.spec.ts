import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
jest.mock('@usertour/emails', () => ({ configureEmailBranding: jest.fn() }));

const CONFIG: Record<string, unknown> = {
  'email.host': 'smtp.example.com',
  'email.port': 465,
  'email.user': 'mailer',
  'email.pass': 'secret',
  'auth.email.sender': 'Usertour <support@usertour.io>',
  'app.homepageUrl': 'https://app.example.com',
};
const configService = { get: (key: string) => CONFIG[key] } as unknown as ConfigService;

const message = { to: 'ada@example.com', subject: 'Hello', html: '<p>Hi</p>', text: 'Hi' };

describe('EmailService', () => {
  const createTransportMock = createTransport as unknown as jest.Mock;
  const sendMail = jest.fn();
  const close = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createTransportMock.mockReturnValue({ sendMail, close });
    sendMail.mockResolvedValue({ messageId: 'id-1' });
  });

  it('opens one pooled transport and reuses it across sends', async () => {
    const service = new EmailService(configService);

    await service.send(message);
    await service.send({ ...message, to: 'grace@example.com' });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.example.com', port: 465, pool: true }),
    );
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('sends the configured sender and the plain-text alternative', async () => {
    const service = new EmailService(configService);

    await service.send(message);

    expect(sendMail).toHaveBeenCalledWith({
      from: 'Usertour <support@usertour.io>',
      to: 'ada@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      text: 'Hi',
    });
  });

  it('sendOrLog swallows a transport failure', async () => {
    const service = new EmailService(configService);
    sendMail.mockRejectedValueOnce(new Error('421 too many connections'));

    await expect(service.sendOrLog(message)).resolves.toBeUndefined();
  });

  it('has nothing to close on shutdown if no email was ever sent', () => {
    const service = new EmailService(configService);

    service.onApplicationShutdown();

    expect(close).not.toHaveBeenCalled();
  });

  it('closes the pool on shutdown once one was opened', async () => {
    const service = new EmailService(configService);
    await service.send(message);

    service.onApplicationShutdown();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('fails a send after shutdown instead of hanging on the closed pool', async () => {
    const service = new EmailService(configService);
    await service.send(message);

    service.onApplicationShutdown();

    await expect(service.send(message)).rejects.toThrow('shutting down');
    await expect(service.sendOrLog(message)).resolves.toBeUndefined();
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
