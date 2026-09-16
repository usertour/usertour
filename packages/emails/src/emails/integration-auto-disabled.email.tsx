import { Heading, Text } from '@react-email/components';
import { headingStyle, paragraphStyle } from '../common-style';
import { CallToAction } from '../components/call-to-action';
import { EmailLayout } from '../components/layout';
import { MonoBlock } from '../components/mono-block';

export interface IntegrationAutoDisabledEmailProps {
  providerName: string;
  projectName: string;
  failingDays: number;
  settingsUrl: string;
}

export const subject = (_props: IntegrationAutoDisabledEmailProps): string =>
  'A Usertour integration was disabled after continuous failures';

export const IntegrationAutoDisabledEmail = (props: IntegrationAutoDisabledEmailProps) => {
  const { providerName, projectName, failingDays, settingsUrl } = props;

  return (
    <EmailLayout
      preview={`Event deliveries in ${projectName} failed for ${failingDays} days`}
      reason={`You're receiving this because you're an owner or admin of ${projectName}.`}
    >
      <Heading style={headingStyle}>An integration was disabled</Heading>
      <Text style={paragraphStyle}>
        Event deliveries to the following integration in {projectName} have been failing
        continuously for {failingDays} days, so Usertour has disabled it:
      </Text>
      <MonoBlock label="Integration" value={providerName} />
      <Text style={paragraphStyle}>
        No events are being sent to it. The most common cause is a revoked or rotated API key —
        update the key and re-enable the integration to resume delivery. If you no longer need it,
        you can delete it.
      </Text>
      <CallToAction href={settingsUrl} label="Open integration settings" />
    </EmailLayout>
  );
};

IntegrationAutoDisabledEmail.PreviewProps = {
  providerName: 'mixpanel',
  projectName: 'Acme',
  failingDays: 7,
  settingsUrl: 'https://app.usertour.io/project/preview-project/settings/integrations/mixpanel',
} satisfies IntegrationAutoDisabledEmailProps;

export default IntegrationAutoDisabledEmail;
