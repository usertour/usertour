export interface Integration {
  name: string;
  code: string;
  description: string;
  imagePath: string;
  disabled?: boolean;
  needsConnect?: boolean;
}

export const integrations: Integration[] = [
  {
    name: 'Amplitude',
    code: 'amplitude',
    description:
      'Write Usertour event data directly to Amplitude to power analytics, user targeting, and more.',
    imagePath: '/images/integrations/amplitude.png',
  },
  {
    name: 'Heap',
    code: 'heap',
    description:
      'Read and write data directly to Heap to power analytics, user targeting, and more.',
    imagePath: '/images/integrations/heap.png',
  },
  {
    name: 'HubSpot',
    code: 'hubspot',
    description:
      'Sync Usertour directly with your Hubspot to write Usertour activities to Hubspot.',
    imagePath: '/images/integrations/hubspot.png',
  },
  {
    name: 'Mixpanel',
    code: 'mixpanel',
    description: 'Read data from Mixpanel to power analytics, user targeting, and more.',
    imagePath: '/images/integrations/mixpanel.png',
  },
  {
    name: 'Posthog',
    code: 'posthog',
    description: 'Write data directly to Posthog to power analytics, user targeting, and more.',
    imagePath: '/images/integrations/posthog.png',
  },
  {
    name: 'Salesforce',
    code: 'salesforce',
    description:
      'Connect Usertour to Salesforce to enrich accounts and sync data between platforms.',
    imagePath: '/images/integrations/salesforce.png',
    needsConnect: true,
  },
  {
    name: 'Salesforce Sandbox',
    code: 'salesforce-sandbox',
    description:
      'Connect Usertour to Salesforce Sandbox to test Usertour Flows with Salesforce data.',
    imagePath: '/images/integrations/salesforce.png',
    needsConnect: true,
  },
  {
    name: 'Segment',
    code: 'segment',
    description:
      'Read and write data directly to Segment to power analytics, user targeting, and more.',
    imagePath: '/images/integrations/segment.png',
  },
  {
    name: 'Zapier',
    code: 'zapier',
    description: 'Connect Usertour to 3,000+ apps with Zapier to automate your workflows.',
    imagePath: '/images/integrations/zapier.png',
  },
];
