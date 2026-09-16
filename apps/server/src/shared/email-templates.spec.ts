import {
  configureEmailBranding,
  renderIntegrationAutoDisabledEmail,
  renderInviteTeamMemberEmail,
  renderResetPasswordEmail,
  renderVerifyEmail,
  renderWebhookAutoDisabledEmail,
} from '@usertour/emails';

const APP_URL = 'https://app.example.com';

describe('email templates', () => {
  afterEach(() => {
    configureEmailBranding({ logoUrl: undefined });
  });

  const templates = [
    {
      name: 'verify email',
      link: `${APP_URL}/auth/registration/code-1`,
      subject: 'Welcome to Usertour, verify your email',
      render: (link: string) => renderVerifyEmail({ url: link }),
    },
    {
      name: 'reset password',
      link: `${APP_URL}/auth/password-reset/id-1`,
      subject: 'Set up a new password for Usertour',
      render: (link: string) => renderResetPasswordEmail({ name: 'Ada', url: link }),
    },
    {
      name: 'invite team member',
      link: `${APP_URL}/auth/invite/code-1`,
      subject: 'Grace invited you to Usertour',
      render: (link: string) =>
        renderInviteTeamMemberEmail({
          inviterName: 'Grace',
          name: 'Ada',
          projectName: 'Acme',
          url: link,
        }),
    },
    {
      name: 'webhook auto-disabled',
      link: `${APP_URL}/project/p1/settings/webhooks/w1`,
      subject: 'A Usertour webhook endpoint was disabled after continuous failures',
      render: (link: string) =>
        renderWebhookAutoDisabledEmail({
          url: 'https://hooks.example.com/usertour',
          projectName: 'Acme',
          failingDays: 7,
          settingsUrl: link,
        }),
    },
    {
      name: 'integration auto-disabled',
      link: `${APP_URL}/project/p1/settings/integrations/mixpanel`,
      subject: 'A Usertour integration was disabled after continuous failures',
      render: (link: string) =>
        renderIntegrationAutoDisabledEmail({
          providerName: 'mixpanel',
          projectName: 'Acme',
          failingDays: 7,
          settingsUrl: link,
        }),
    },
  ];

  it.each(templates)(
    '$name carries its subject, action link and reason in both html and text',
    ({ link, subject, render }) => {
      const rendered = render(link);

      expect(rendered.subject).toBe(subject);
      expect(rendered.html).toContain(`href="${link}"`);
      expect(rendered.text).toContain(link);
      expect(rendered.html).toContain('You&#x27;re receiving this because');
      expect(rendered.text).toContain("You're receiving this because");
    },
  );

  it('escapes values that come from users', () => {
    const rendered = renderInviteTeamMemberEmail({
      inviterName: '<b>Mallory</b>',
      name: 'Ada',
      projectName: 'Acme',
      url: `${APP_URL}/auth/invite/code-1`,
    });

    expect(rendered.html).not.toContain('<b>Mallory</b>');
    expect(rendered.html).toContain('&lt;b&gt;Mallory&lt;/b&gt;');
  });

  it('shows the configured wordmark image at a fixed width and height', () => {
    configureEmailBranding({ logoUrl: `${APP_URL}/images/email-logo.png` });

    const rendered = renderVerifyEmail({ url: `${APP_URL}/auth/registration/code-1` });

    expect(rendered.html).toContain(`src="${APP_URL}/images/email-logo.png"`);
    expect(rendered.html).toMatch(/<img[^>]*width="117"/);
    expect(rendered.html).toMatch(/<img[^>]*height="30"/);
  });

  it('keeps the card inset on a cell, never on a table', () => {
    const rendered = renderVerifyEmail({ url: `${APP_URL}/auth/registration/code-1` });

    expect(rendered.html).toMatch(/<td[^>]*style="[^"]*padding:40px 44px/);
    expect(rendered.html).not.toMatch(/<table[^>]*style="[^"]*padding:/);
  });

  it('places the postscript after the sign-off', () => {
    const rendered = renderInviteTeamMemberEmail({
      inviterName: 'Grace',
      name: 'Ada',
      projectName: 'Acme',
      url: `${APP_URL}/auth/invite/code-1`,
    });

    expect(rendered.text.indexOf('— The Usertour team')).toBeLessThan(
      rendered.text.indexOf('P.S.'),
    );
  });

  it('falls back to a text wordmark when no logo is configured', () => {
    const rendered = renderVerifyEmail({ url: `${APP_URL}/auth/registration/code-1` });

    expect(rendered.html).not.toContain('<img');
    expect(rendered.html).toContain('>Usertour<');
  });
});
