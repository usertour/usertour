import { Button } from '@usertour-ui/button';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from '@usertour-ui/dialog';
import { Input } from '@usertour-ui/input';
import { Skeleton } from '@usertour-ui/skeleton';
import { useState } from 'react';
import { useListIntegrationsQuery, useUpdateIntegrationMutation } from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';
import { IntegrationModel } from '@usertour-ui/types';
import { useAppContext } from '@/contexts/app-context';

interface Integration {
  name: string;
  code: string;
  description: string;
  imagePath: string;
}

const integrations: Integration[] = [
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
  },
  {
    name: 'Salesforce Sandbox',
    code: 'salesforce-sandbox',
    description:
      'Connect Usertour to Salesforce Sandbox to test Usertour Flows with Salesforce data.',
    imagePath: '/images/integrations/salesforce.png',
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

interface IntegrationCardProps {
  integration: Integration;
  enabled?: boolean;
  onConnect: (code: string) => void;
}

const IntegrationCard = ({ integration, enabled, onConnect }: IntegrationCardProps) => {
  return (
    <li className="cursor-default rounded-lg border border-input px-4 py-6 text-sm">
      <div className="flex items-center justify-between">
        <img
          className="bg-accent object-cover data-[loaded]:bg-transparent h-8 w-8 rounded-lg border border-accent-light"
          src={integration.imagePath}
          alt={`${integration.name} logo`}
        />
        {enabled ? (
          <Button variant="secondary" size="sm" disabled>
            Connected
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => onConnect(integration.code)}>
            Connect
          </Button>
        )}
      </div>
      <div className="mt-2 font-medium">{integration.name}</div>
      <div className="mt-1">{integration.description}</div>
    </li>
  );
};

const IntegrationCardSkeleton = () => {
  return (
    <li className="cursor-default rounded-lg border border-input px-4 py-6 text-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="mt-2">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="mt-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-3/4" />
      </div>
    </li>
  );
};

export const IntegrationsListContent = () => {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();
  const { environment } = useAppContext();

  const environmentId = environment?.id || '';
  const { data: integrationsData, loading, refetch } = useListIntegrationsQuery(environmentId);
  const { invoke: updateIntegration, loading: updating } = useUpdateIntegrationMutation();

  const handleConnect = (code: string) => {
    setSelectedCode(code);
  };

  const handleSubmit = async () => {
    if (!selectedCode || !apiKey) return;

    try {
      await updateIntegration(environmentId, selectedCode, {
        key: apiKey,
        enabled: true,
      });
      toast({
        title: 'Success',
        description: 'Integration connected successfully',
      });
      setSelectedCode(null);
      setApiKey('');
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to connect integration',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <ul className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[...Array(6)].map((_, index) => (
          <IntegrationCardSkeleton key={index} />
        ))}
      </ul>
    );
  }

  return (
    <>
      <ul className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.name}
            integration={integration}
            enabled={
              integrationsData?.find((i: IntegrationModel) => i.code === integration.code)?.enabled
            }
            onConnect={handleConnect}
          />
        ))}
      </ul>

      <Dialog open={!!selectedCode} onOpenChange={() => setSelectedCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Integration</DialogTitle>
            <DialogDescription>Enter your API key to connect the integration</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Enter API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCode(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!apiKey || updating}>
              {updating ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
