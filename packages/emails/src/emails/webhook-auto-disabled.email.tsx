import { Heading, Text } from '@react-email/components';
import { headingStyle, paragraphStyle } from '../common-style';
import { CallToAction } from '../components/call-to-action';
import { EmailLayout } from '../components/layout';
import { MonoBlock } from '../components/mono-block';

export interface WebhookAutoDisabledEmailProps {
  /** The endpoint that stopped accepting deliveries. */
  url: string;
  projectName: string;
  failingDays: number;
  settingsUrl: string;
}

export const subject = (_props: WebhookAutoDisabledEmailProps): string =>
  'A Usertour webhook endpoint was disabled after continuous failures';

export const WebhookAutoDisabledEmail = (props: WebhookAutoDisabledEmailProps) => {
  const { url, projectName, failingDays, settingsUrl } = props;

  return (
    <EmailLayout
      preview={`Deliveries in ${projectName} failed for ${failingDays} days`}
      reason={`You're receiving this because you're an owner or admin of ${projectName}.`}
    >
      <Heading style={headingStyle}>A webhook endpoint was disabled</Heading>
      <Text style={paragraphStyle}>
        Deliveries to the following webhook endpoint in {projectName} have been failing continuously
        for {failingDays} days, so Usertour has disabled it:
      </Text>
      <MonoBlock label="Endpoint" value={url} />
      <Text style={paragraphStyle}>
        No events are being delivered to it. If the endpoint is back up, re-enable the webhook and
        use Resend on any message you need — recent messages are kept for 30 days. If you no longer
        need it, you can delete it.
      </Text>
      <CallToAction href={settingsUrl} label="Open webhook settings" />
    </EmailLayout>
  );
};

WebhookAutoDisabledEmail.PreviewProps = {
  url: 'https://hooks.example.com/usertour/events',
  projectName: 'Acme',
  failingDays: 7,
  settingsUrl: 'https://app.usertour.io/project/preview-project/settings/webhooks/preview-webhook',
} satisfies WebhookAutoDisabledEmailProps;

export default WebhookAutoDisabledEmail;
