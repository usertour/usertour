import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
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
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  get isConfigured(): boolean {
    return !!(this.configService.get('email.host') && this.configService.get('email.user'));
  }

  async send(input: SendEmailInput) {
    const transporter = createTransport({
      host: this.configService.get('email.host'),
      port: this.configService.get('email.port'),
      secure: true,
      auth: {
        user: this.configService.get('email.user'),
        pass: this.configService.get('email.pass'),
      },
    });
    return await transporter.sendMail({
      from: input.from ?? this.configService.get('auth.email.sender'),
      to: input.to,
      subject: input.subject,
      html: input.html,
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
