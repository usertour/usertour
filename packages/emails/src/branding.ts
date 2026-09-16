/**
 * What the emails show in the header. Set once at process start by the
 * service that sends mail; templates read it at render time. Without a logo
 * URL the header falls back to a text wordmark, which is what local previews
 * and tests get.
 */
export interface EmailBranding {
  /** Absolute URL of the wordmark PNG; email clients cannot load SVG. */
  logoUrl?: string;
}

let branding: EmailBranding = {};

export const configureEmailBranding = (next: Partial<EmailBranding>): void => {
  branding = { ...branding, ...next };
};

export const emailBranding = (): EmailBranding => branding;
