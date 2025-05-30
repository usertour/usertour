import { Button } from '@usertour-ui/button';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from '@usertour-ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-ui/alert-dialog';
import { Input } from '@usertour-ui/input';
import { useState } from 'react';
import { useListIntegrationsQuery, useUpdateIntegrationMutation } from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';
import { IntegrationModel } from '@usertour-ui/types';
import { useAppContext } from '@/contexts/app-context';
import {
  ArrowRightIcon,
  CircleIcon,
  DisconnectIcon,
  EditIcon,
  SpinnerIcon,
} from '@usertour-ui/icons';
import { DotsVerticalIcon } from '@radix-ui/react-icons';
import { DropdownMenuItem } from '@usertour-ui/dropdown-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@usertour-ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from '@usertour-ui/select';

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
  onDisconnect: (code: string) => void;
  loading?: boolean;
}

const IntegrationCard = ({
  integration,
  enabled,
  onConnect,
  onDisconnect,
  loading,
}: IntegrationCardProps) => {
  const [showDisconnectAlert, setShowDisconnectAlert] = useState(false);

  return (
    <li className="cursor-default rounded-lg border border-input px-4 py-6 text-sm">
      <div className="flex items-center justify-between">
        <img
          className="bg-accent object-cover data-[loaded]:bg-transparent h-8 w-8 rounded-lg border border-accent-light"
          src={integration.imagePath}
          alt={`${integration.name} logo`}
        />
        {enabled ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <DotsVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[101]">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onConnect(integration.code)}
                >
                  <EditIcon className="mr-1 w-4 h-4" />
                  Edit connection
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={() => setShowDisconnectAlert(true)}
                >
                  <DisconnectIcon className="mr-1 w-4 h-4" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDisconnectAlert} onOpenChange={setShowDisconnectAlert}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Integration</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to disconnect {integration.name}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      onDisconnect(integration.code);
                      setShowDisconnectAlert(false);
                    }}
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onConnect(integration.code)}
            disabled={loading}
          >
            {loading ? <SpinnerIcon className="h-4 w-4 animate-spin mr-2" /> : 'Connect'}
          </Button>
        )}
      </div>
      <div className="mt-2 font-medium flex items-center">
        <span>{integration.name}</span>
        {enabled && (
          <div className="flex items-center gap-1 ml-2">
            <CircleIcon className="w-3 h-3 text-success" />
            <span className="text-xs text-muted-foreground">Connected</span>
          </div>
        )}
      </div>
      <div className="mt-1">{integration.description}</div>
    </li>
  );
};

interface IntegrationConfigProps {
  integration: Integration;
  onClose: () => void;
  onSubmit: (config: {
    key: string;
    enabled: boolean;
    config?: { region?: string };
  }) => Promise<void>;
  loading: boolean;
  integrationsData?: IntegrationModel[];
}

const AmplitudeConfig = ({
  integration,
  onClose,
  onSubmit,
  loading,
  integrationsData,
}: IntegrationConfigProps) => {
  const currentIntegration = integrationsData?.find((i) => i.code === integration.code);
  const [apiKey, setApiKey] = useState(currentIntegration?.key || '');
  const [region, setRegion] = useState(
    (currentIntegration?.config as { region?: string })?.region || 'US',
  );

  const handleSubmit = () => {
    onSubmit({ key: apiKey, enabled: true, config: { region: region || 'US' } });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex flex-col gap-2 pt-4">
          <div className="flex items-center justify-center gap-x-4">
            <div className="h-12 w-12 rounded-lg border border-accent-light p-1.5">
              <img src="/images/logo.png" className="w-full h-full" />
            </div>
            <ArrowRightIcon className="w-6 h-6" />
            <div className="h-12 w-12 rounded-lg border border-accent-light p-1.5">
              <img
                src={integration.imagePath}
                alt={`${integration.name} logo`}
                className="w-8 h-8"
              />
            </div>
          </div>
          <div className="mt-4 text-center text-lg/6 font-semibold">Connect {integration.name}</div>
        </DialogTitle>
        <DialogDescription className="mt-2 text-center">
          {integration.description}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">API Key:</p>
          <Input
            type="text"
            placeholder="Type Amplitude API key here"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Region:</p>
          <Select value={region || 'US'} onValueChange={(value) => setRegion(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Default(US)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="US">Default(US)</SelectItem>
              <SelectItem value="EU">EU</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!apiKey || loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

const HubSpotConfig = ({
  integration,
  onClose,
  onSubmit,
  loading,
  integrationsData,
}: IntegrationConfigProps) => {
  const currentIntegration = integrationsData?.find((i) => i.code === integration.code);
  const [apiKey, setApiKey] = useState(currentIntegration?.key || '');

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex flex-col gap-2 pt-4">
          <div className="flex items-center justify-center gap-x-4">
            <div className="h-12 w-12 rounded-lg border border-accent-light p-1.5">
              <img src="/images/logo.png" className="w-full h-full" />
            </div>
            <ArrowRightIcon className="w-6 h-6" />
            <div className="h-12 w-12 rounded-lg border border-accent-light p-1.5">
              <img
                src={integration.imagePath}
                alt={`${integration.name} logo`}
                className="w-8 h-8"
              />
            </div>
          </div>
          <div className="mt-4 text-center text-lg/6 font-semibold">Connect {integration.name}</div>
        </DialogTitle>
        <DialogDescription className="mt-2 text-center">
          {integration.description}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2 mt-2">
        <p className="text-sm text-muted-foreground">Private App Token:</p>
        <Input
          type="text"
          placeholder="Type Private App Token here"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => onSubmit({ key: apiKey, enabled: true })}
          disabled={!apiKey || loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

const HeapConfig = ({
  integration,
  onClose,
  onSubmit,
  loading,
  integrationsData,
}: IntegrationConfigProps) => {
  const currentIntegration = integrationsData?.find((i) => i.code === integration.code);
  const [apiKey, setApiKey] = useState(currentIntegration?.key || '');

  const handleSubmit = () => {
    onSubmit({ key: apiKey, enabled: true });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex flex-col gap-2 pt-4">
          <div className="flex items-center justify-center gap-x-4">
            <div className="h-12 w-12 rounded-lg border border-accent-light p-1.5">
              <img src="/images/logo.png" className="w-full h-full" />
            </div>
            <ArrowRightIcon className="w-6 h-6" />
            <div className="h-12 w-12 rounded-lg border border-accent-light p-1.5">
              <img
                src={integration.imagePath}
                alt={`${integration.name} logo`}
                className="w-8 h-8"
              />
            </div>
          </div>
          <div className="mt-4 text-center text-lg/6 font-semibold">Connect {integration.name}</div>
        </DialogTitle>
        <DialogDescription className="mt-2 text-center">
          {integration.description}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Heap App ID:</p>
          <Input
            type="text"
            placeholder="Type Heap App ID here"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!apiKey || loading}>
          {loading ? 'Connecting...' : 'Connect'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

// Configuration mapping for different integration types
const integrationConfigs: Record<string, React.ComponentType<IntegrationConfigProps>> = {
  amplitude: AmplitudeConfig,
  hubspot: HubSpotConfig,
  heap: HeapConfig,
  // Add more integration configs here
};

// Default config for integrations without specific config
const DefaultConfig = ({
  integration,
  onClose,
  onSubmit,
  loading,
  integrationsData,
}: IntegrationConfigProps) => {
  const currentIntegration = integrationsData?.find((i) => i.code === integration.code);
  const [apiKey, setApiKey] = useState(currentIntegration?.key || '');

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex flex-col gap-2 pt-4">
          <div className="flex items-center justify-center gap-x-4">
            <div className="h-12 w-12 rounded-lg border border-accent-light p-1.5">
              <img src="/images/logo.png" className="w-full h-full" />
            </div>
            <ArrowRightIcon className="w-6 h-6" />
            <div className="h-12 w-12 rounded-lg border border-accent-light p-1.5">
              <img
                src={integration.imagePath}
                alt={`${integration.name} logo`}
                className="w-8 h-8"
              />
            </div>
          </div>
          <div className="mt-4 text-center text-lg/6 font-semibold">Connect {integration.name}</div>
        </DialogTitle>
        <DialogDescription className="mt-2 text-center">
          {integration.description}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2 mt-2">
        <p className="text-sm text-muted-foreground">API Key:</p>
        <Input
          type="text"
          placeholder="Enter API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => onSubmit({ key: apiKey, enabled: true })}
          disabled={!apiKey || loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export const IntegrationsListContent = () => {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const { toast } = useToast();
  const { environment } = useAppContext();

  const environmentId = environment?.id || '';
  const {
    data: integrationsData,
    refetch,
    loading: loadingIntegrations,
  } = useListIntegrationsQuery(environmentId);
  const { invoke: updateIntegration, loading: updating } = useUpdateIntegrationMutation();

  const handleConnect = (code: string) => {
    setSelectedCode(code);
  };

  const handleDisconnect = async (code: string) => {
    try {
      await updateIntegration(environmentId, code, {
        enabled: false,
        key: '',
      });
      toast({
        title: 'Success',
        description: 'Integration disconnected successfully',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to disconnect integration',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (config: {
    key: string;
    enabled: boolean;
    config?: { region?: string };
  }) => {
    if (!selectedCode) return;

    try {
      await updateIntegration(environmentId, selectedCode, config);
      toast({
        title: 'Success',
        description: 'Integration connected successfully',
      });
      setSelectedCode(null);
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to connect integration',
        variant: 'destructive',
      });
    }
  };

  const selectedIntegration = selectedCode
    ? integrations.find((i) => i.code === selectedCode)
    : null;
  const ConfigComponent =
    selectedIntegration && selectedCode ? integrationConfigs[selectedCode] || DefaultConfig : null;

  return (
    <>
      <ul className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {integrations.map((integration) => {
          const isEnabled =
            integrationsData?.find((i: IntegrationModel) => i.code === integration.code)?.enabled ??
            false;
          const isLoading = updating && selectedCode === integration.code;

          return (
            <IntegrationCard
              key={integration.name}
              integration={integration}
              enabled={isEnabled}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              loading={isLoading || loadingIntegrations}
            />
          );
        })}
      </ul>

      <Dialog open={!!selectedCode} onOpenChange={() => setSelectedCode(null)}>
        {selectedIntegration && ConfigComponent && (
          <ConfigComponent
            integration={selectedIntegration}
            onClose={() => setSelectedCode(null)}
            onSubmit={handleSubmit}
            loading={updating}
            integrationsData={integrationsData}
          />
        )}
      </Dialog>
    </>
  );
};
