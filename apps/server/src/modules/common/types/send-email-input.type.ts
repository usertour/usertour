export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative for clients that do not render HTML. */
  text?: string;
  /** Overrides the configured EMAIL_SENDER. */
  from?: string;
}
