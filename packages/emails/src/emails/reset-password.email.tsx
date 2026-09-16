import { Heading, Text } from '@react-email/components';
import { headingStyle, mutedParagraphStyle, paragraphStyle } from '../common-style';
import { CallToAction } from '../components/call-to-action';
import { EmailLayout } from '../components/layout';

export interface ResetPasswordEmailProps {
  name: string;
  url: string;
}

export const subject = (_props: ResetPasswordEmailProps): string =>
  'Set up a new password for Usertour';

export const ResetPasswordEmail = (props: ResetPasswordEmailProps) => {
  const { name, url } = props;

  return (
    <EmailLayout
      preview="Use the link inside to reset your password. It is valid for one hour."
      reason="You're receiving this because a password reset was requested for your Usertour account."
    >
      <Heading style={headingStyle}>Set up a new password for Usertour!</Heading>
      <Text style={paragraphStyle}>Hi {name},</Text>
      <Text style={paragraphStyle}>
        You recently requested to reset your password for your Usertour account. Use the button
        below to reset it. <b>This password reset link is only valid for the next hour.</b>
      </Text>
      <CallToAction href={url} label="Reset your password" />
      <Text style={mutedParagraphStyle}>
        If you did not request a password reset, please ignore this email or contact support if you
        have questions.
      </Text>
    </EmailLayout>
  );
};

ResetPasswordEmail.PreviewProps = {
  name: 'Ada',
  url: 'https://app.usertour.io/auth/password-reset/preview-id',
} satisfies ResetPasswordEmailProps;

export default ResetPasswordEmail;
