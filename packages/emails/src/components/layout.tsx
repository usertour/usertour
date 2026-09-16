import { Body, Head, Html, Img, Preview, Section, Text } from '@react-email/components';
import type { ReactNode } from 'react';
import { emailBranding } from '../branding';
import {
  bodyStyle,
  cardStyle,
  footerStyle,
  footerTextStyle,
  logoSectionStyle,
  signOffStyle,
  wordmarkStyle,
} from '../common-style';

export interface EmailLayoutProps {
  /** Inbox preview line, shown next to the subject in most clients. */
  preview: string;
  /**
   * Why the recipient is getting this email, e.g. "You're receiving this
   * because you're an owner or admin of Acme." Shown under the card.
   */
  reason: string;
  children: ReactNode;
}

/**
 * A white card on a grey page: the logo, the message, a sign-off; then a
 * small footer outside the card saying why the recipient got the email.
 */
export const EmailLayout = (props: EmailLayoutProps) => {
  const { preview, reason, children } = props;
  const { logoUrl } = emailBranding();

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Section style={cardStyle}>
          <Section style={logoSectionStyle}>
            {logoUrl ? (
              <Img src={logoUrl} alt="Usertour" height={28} style={{ display: 'block' }} />
            ) : (
              <Text style={wordmarkStyle}>Usertour</Text>
            )}
          </Section>
          {children}
          <Text style={signOffStyle}>— The Usertour team</Text>
        </Section>
        <Section style={footerStyle}>
          <Text style={footerTextStyle}>{reason}</Text>
        </Section>
      </Body>
    </Html>
  );
};

export default EmailLayout;
