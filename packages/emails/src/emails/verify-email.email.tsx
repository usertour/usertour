import { Heading, Link, Text } from '@react-email/components';
import { headingStyle, linkStyle, paragraphStyle } from '../common-style';
import { CallToAction } from '../components/call-to-action';
import { EmailLayout } from '../components/layout';

export interface VerifyEmailProps {
  url: string;
}

export const subject = (_props: VerifyEmailProps): string =>
  'Welcome to Usertour, verify your email';

export const VerifyEmail = (props: VerifyEmailProps) => {
  const { url } = props;

  return (
    <EmailLayout
      preview="Verify your email to finish setting up your account"
      reason="You're receiving this because you signed up for a Usertour account. If you're not sure why you received this email, please ignore it or feel free to contact us."
    >
      <Heading style={headingStyle}>Welcome to Usertour!</Heading>
      <Text style={paragraphStyle}>
        <Link href={url} style={linkStyle}>
          Verify your email
        </Link>{' '}
        to finish setting up your account.
      </Text>
      <CallToAction href={url} label="Verify my email" />
    </EmailLayout>
  );
};

VerifyEmail.PreviewProps = {
  url: 'https://app.usertour.io/auth/registration/preview-code',
} satisfies VerifyEmailProps;

export default VerifyEmail;
