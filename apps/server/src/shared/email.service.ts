import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configureEmailBranding } from '@usertour/emails';
import { type Transporter, createTransport } from 'nodemailer';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative for clients that do not render HTML. */
  text?: string;
  /** Overrides the configured EMAIL_SENDER. */
  from?: string;
}

/**
 * Thin shared SMTP sender (nodemailer over the `email.*` config) — extracted
 * from AuthService so non-auth modules (webhooks) don't have to depend on it.
 *
 * `sendOrLog` is the fire-and-forget variant for notifications that must never
 * break their caller: it no-ops when SMTP isn't configured (a common
 * self-hosted state) and swallows transport errors after logging them. Flows
 * where the email IS the feature (magic link, invite) should keep calling
 * `send` and surface failures.
 */
@Injectable()
export class EmailService implements OnModuleDestroy {
  private readonly logger = new Logger(EmailService.name);
  private transporter?: Transporter;

  constructor(private readonly configService: ConfigService) {
    // Every template rendered in this process shows the wordmark that ships
    // with the web app's static images. With no origin configured the
    // templates fall back to a text wordmark.
    const appUrl = (this.configService.get<string>('app.homepageUrl') ?? '').replace(/\/$/, '');
    configureEmailBranding({
      logoUrl: appUrl ? `${appUrl}/images/email-logo.png` : undefined,
    });
  }

  get isConfigured(): boolean {
    return !!(this.configService.get('email.host') && this.configService.get('email.user'));
  }

  /**
   * One pooled transport for the process: connections are reused across
   * sends instead of a fresh TCP + TLS + AUTH handshake per message, and
   * nodemailer queues onto at most five of them, so a notification fanned
   * out to every owner and admin of a project never opens a burst of
   * parallel sessions for the provider to refuse. Opened on first use.
   */
  private getTransporter(): Transporter {
    this.transporter ??= createTransport({
      host: this.configService.get('email.host'),
      port: this.configService.get('email.port'),
      secure: true,
      auth: {
        user: this.configService.get('email.user'),
        pass: this.configService.get('email.pass'),
      },
      pool: true,
    });
    return this.transporter;
  }

  onModuleDestroy(): void {
    this.transporter?.close();
  }

  async send(input: SendEmailInput) {
    return await this.getTransporter().sendMail({
      from: input.from ?? this.configService.get('auth.email.sender'),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }

  async sendOrLog(input: SendEmailInput): Promise<void> {
    if (!this.isConfigured) {
      this.logger.log(`Email not configured — skipping "${input.subject}" to ${input.to}`);
      return;
    }
    try {
      await this.send(input);
    } catch (error) {
      this.logger.error(`Failed to send "${input.subject}" to ${input.to}`, error as Error);
    }
  }
}
