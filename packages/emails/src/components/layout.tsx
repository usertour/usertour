import { Body, Head, Html, Img, Preview, Section, Text } from '@react-email/components';
import type { CSSProperties, ReactNode } from 'react';
import { emailBranding } from '../branding';
import {
  bodyStyle,
  cardStyle,
  footerStyle,
  footerTextStyle,
  frameStyle,
  logoSectionStyle,
  postscriptStyle,
  signOffStyle,
  wordmarkStyle,
} from '../common-style';

/** The wordmark PNG is 234×60, drawn at half size so it stays crisp on dense screens. */
const LOGO_WIDTH = 117;
const LOGO_HEIGHT = 30;

interface FrameProps {
  /** Padding, background and radius for the single cell. */
  cellStyle: CSSProperties;
  children: ReactNode;
}

/**
 * A centred, width-capped table whose one cell carries the padding and
 * background. Outlook drops both from `<table>`, so they have to sit on the
 * `<td>` for the card to keep its inset there. The background is repeated as
 * the cell's `bgcolor` attribute for clients that ignore the CSS one.
 */
const Frame = (props: FrameProps) => {
  const { cellStyle, children } = props;
  const bgcolor = cellStyle.backgroundColor as string | undefined;

  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      width="100%"
      align="center"
      style={frameStyle}
    >
      <tbody>
        <tr>
          <td {...({ bgcolor } as Record<string, string | undefined>)} style={cellStyle}>
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export interface EmailLayoutProps {
  /** Inbox preview line, shown next to the subject in most clients. */
  preview: string;
  /**
   * Why the recipient is getting this email, e.g. "You're receiving this
   * because you're an owner or admin of Acme." Shown under the card.
   */
  reason: string;
  /** An afterthought under the sign-off, e.g. a pointer to the docs. */
  postscript?: ReactNode;
  children: ReactNode;
}

/**
 * A white card on a grey page: the logo, the message, a sign-off; then a
 * small footer outside the card saying why the recipient got the email.
 */
export const EmailLayout = (props: EmailLayoutProps) => {
  const { preview, reason, postscript, children } = props;
  const { logoUrl } = emailBranding();

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Frame cellStyle={cardStyle}>
          <Section style={logoSectionStyle}>
            {logoUrl ? (
              <Img
                src={logoUrl}
                alt="Usertour"
                width={LOGO_WIDTH}
                height={LOGO_HEIGHT}
                style={{ display: 'block' }}
              />
            ) : (
              <Text style={wordmarkStyle}>Usertour</Text>
            )}
          </Section>
          {children}
          <Text style={signOffStyle}>— The Usertour team</Text>
          {postscript ? <Text style={postscriptStyle}>{postscript}</Text> : null}
        </Frame>
        <Frame cellStyle={footerStyle}>
          <Text style={footerTextStyle}>{reason}</Text>
        </Frame>
      </Body>
    </Html>
  );
};

export default EmailLayout;
