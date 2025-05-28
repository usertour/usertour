import { Button } from '@usertour-ui/button';

interface Integration {
  name: string;
  description: string;
  imagePath: string;
}

const integrations: Integration[] = [
  {
    name: 'Amplitude',
    description:
      'Write Usertour event data directly to Amplitude to power analytics, user targeting, and more.',
    imagePath: '/images/integrations/amplitude.png',
  },
  {
    name: 'Heap',
    description:
      'Read and write data directly to Heap to power analytics, user targeting, and more.',
    imagePath: '/images/integrations/heap.png',
  },
  {
    name: 'HubSpot',
    description:
      'Sync Usertour directly with your Hubspot to write Usertour activities to Hubspot.',
    imagePath: '/images/integrations/hubspot.png',
  },
  {
    name: 'Mixpanel',
    description: 'Read data from Mixpanel to power analytics, user targeting, and more.',
    imagePath: '/images/integrations/hubspot.png',
  },
  {
    name: 'Posthog',
    description: 'Write data directly to Posthog to power analytics, user targeting, and more.',
    imagePath: '/images/integrations/posthog.png',
  },
  {
    name: 'Salesforce',
    description:
      'Connect Usertour to Salesforce to enrich accounts and sync data between platforms.',
    imagePath: '/images/integrations/salesforce.png',
  },
  {
    name: 'Salesforce Sandbox',
    description:
      'Connect Usertour to Salesforce Sandbox to test Usertour Flows with Salesforce data.',
    imagePath: '/images/integrations/salesforce.png',
  },
  {
    name: 'Segment',
    description:
      'Read and write data directly to Segment to power analytics, user targeting, and more.',
    imagePath: '/images/integrations/segment.png',
  },
  {
    name: 'Zapier',
    description: 'Connect Usertour to 3,000+ apps with Zapier to automate your workflows.',
    imagePath: '/images/integrations/zapier.png',
  },
];

interface IntegrationCardProps {
  integration: Integration;
}

const IntegrationCard = ({ integration }: IntegrationCardProps) => {
  return (
    <li className="cursor-default rounded-lg border border-input px-4 py-6 text-sm">
      <div className="flex items-center justify-between">
        <img
          className="bg-accent object-cover data-[loaded]:bg-transparent h-8 w-8 rounded-lg border border-accent-light"
          src={integration.imagePath}
          alt={`${integration.name} logo`}
        />
        <Button variant="secondary" size="sm">
          Connect
        </Button>
      </div>
      <div className="mt-2 font-medium">{integration.name}</div>
      <div className="mt-1">{integration.description}</div>
    </li>
  );
};

export const IntegrationsListContent = () => {
  return (
    <ul className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
      {integrations.map((integration) => (
        <IntegrationCard key={integration.name} integration={integration} />
      ))}
    </ul>
  );
};
