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
    description: 'Send Usertour events to Amplitude and receive Amplitude Cohorts.',
    imagePath: '/images/integrations/amplitude.png',
  },
  {
    name: 'Heap',
    code: 'heap',
    description: 'Send Usertour events to Heap and sync Heap segments into Usertour.',
    imagePath: '/images/integrations/heap.png',
  },
  {
    name: 'HubSpot',
    code: 'hubspot',
    description: 'Send Usertour events to HubSpot and sync properties back into Usertour.',
    imagePath: '/images/integrations/hubspot.png',
  },
  {
    name: 'Mixpanel',
    code: 'mixpanel',
    description: 'Send Usertour events to Mixpanel and receive Mixpanel Cohorts.',
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
    description: 'Send Usertour events to Salesforce and sync properties back into Usertour.',
    imagePath: '/images/integrations/salesforce.png',
    needsConnect: true,
  },
  {
    name: 'Salesforce Sandbox',
    code: 'salesforce-sandbox',
    description: 'Test your Salesforce integration in a safe environment.',
    imagePath: '/images/integrations/salesforce.png',
    needsConnect: true,
  },
  {
    name: 'Segment',
    code: 'segment',
    description: 'Send Usertour events to Segment and sync properties back into Usertour.',
    imagePath: '/images/integrations/segment.png',
  },
  {
    name: 'Zapier',
    code: 'zapier',
    description: 'Connect Usertour to 3,000+ apps with Zapier to automate your workflows.',
    imagePath: '/images/integrations/zapier.png',
  },
];
