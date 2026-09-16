import { Heading, Link, Text } from '@react-email/components';
import { headingStyle, linkStyle, mutedParagraphStyle, paragraphStyle } from '../common-style';
import { CallToAction } from '../components/call-to-action';
import { EmailLayout } from '../components/layout';

const DOCS_URL = 'https://docs.usertour.io';

export interface InviteTeamMemberEmailProps {
  inviterName: string;
  name: string;
  projectName: string;
  url: string;
}

export const subject = (props: InviteTeamMemberEmailProps): string =>
  `${props.inviterName} invited you to Usertour`;

export const InviteTeamMemberEmail = (props: InviteTeamMemberEmailProps) => {
  const { inviterName, name, projectName, url } = props;

  return (
    <EmailLayout
      preview={`${inviterName} invited you to join ${projectName} on Usertour`}
      reason={`You're receiving this because ${inviterName} invited you to ${projectName} on Usertour.`}
    >
      <Heading style={headingStyle}>{inviterName} invited you to Usertour</Heading>
      <Text style={paragraphStyle}>Hi {name},</Text>
      <Text style={paragraphStyle}>
        {inviterName} has invited you to join {projectName} on Usertour, where you can collaborate
        on flows, checklists and other onboarding content. Use the button below to set up your
        account and get started:
      </Text>
      <CallToAction href={url} label="Set up account" />
      <Text style={paragraphStyle}>Welcome aboard,</Text>
      <Text style={mutedParagraphStyle}>
        P.S. Need help getting started? Check out our{' '}
        <Link href={DOCS_URL} style={linkStyle}>
          help documentation
        </Link>
        .
      </Text>
    </EmailLayout>
  );
};

InviteTeamMemberEmail.PreviewProps = {
  inviterName: 'Grace',
  name: 'Ada',
  projectName: 'Acme',
  url: 'https://app.usertour.io/auth/invite/preview-code',
} satisfies InviteTeamMemberEmailProps;

export default InviteTeamMemberEmail;
