import { toPlainText } from '@react-email/components';
import { type ReactElement, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import IntegrationAutoDisabledEmail, {
  type IntegrationAutoDisabledEmailProps,
  subject as integrationAutoDisabledSubject,
} from './emails/integration-auto-disabled.email';
import InviteTeamMemberEmail, {
  type InviteTeamMemberEmailProps,
  subject as inviteTeamMemberSubject,
} from './emails/invite-team-member.email';
import ResetPasswordEmail, {
  type ResetPasswordEmailProps,
  subject as resetPasswordSubject,
} from './emails/reset-password.email';
import VerifyEmail, {
  type VerifyEmailProps,
  subject as verifyEmailSubject,
} from './emails/verify-email.email';
import WebhookAutoDisabledEmail, {
  type WebhookAutoDisabledEmailProps,
  subject as webhookAutoDisabledSubject,
} from './emails/webhook-auto-disabled.email';

export { configureEmailBranding, type EmailBranding } from './branding';

export type {
  IntegrationAutoDisabledEmailProps,
  InviteTeamMemberEmailProps,
  ResetPasswordEmailProps,
  VerifyEmailProps,
  WebhookAutoDisabledEmailProps,
};

/** A fully rendered email, ready to hand to the mail transport. */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** The doctype email clients expect; the same one react-email's own renderer emits. */
const EMAIL_DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

/**
 * Renders synchronously through react-dom's static markup API. The templates
 * never suspend, so nothing is lost against react-email's streaming
 * `render()`, and the sender (and its tests) stay free of the dynamic
 * `import()` that renderer relies on.
 */
const renderEmail = <TProps extends object>(
  component: (props: TProps) => ReactElement,
  props: TProps,
  subject: string,
): RenderedEmail => {
  const markup = renderToStaticMarkup(createElement(component, props));

  return { subject, html: `${EMAIL_DOCTYPE}${markup}`, text: toPlainText(markup) };
};

export const renderVerifyEmail = (props: VerifyEmailProps): RenderedEmail =>
  renderEmail(VerifyEmail, props, verifyEmailSubject(props));

export const renderResetPasswordEmail = (props: ResetPasswordEmailProps): RenderedEmail =>
  renderEmail(ResetPasswordEmail, props, resetPasswordSubject(props));

export const renderInviteTeamMemberEmail = (props: InviteTeamMemberEmailProps): RenderedEmail =>
  renderEmail(InviteTeamMemberEmail, props, inviteTeamMemberSubject(props));

export const renderWebhookAutoDisabledEmail = (
  props: WebhookAutoDisabledEmailProps,
): RenderedEmail => renderEmail(WebhookAutoDisabledEmail, props, webhookAutoDisabledSubject(props));

export const renderIntegrationAutoDisabledEmail = (
  props: IntegrationAutoDisabledEmailProps,
): RenderedEmail =>
  renderEmail(IntegrationAutoDisabledEmail, props, integrationAutoDisabledSubject(props));
