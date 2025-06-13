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
import {
  useListIntegrationsQuery,
  useUpdateIntegrationMutation,
  useGetSalesforceAuthUrlQuery,
} from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';
import { IntegrationModel } from '@usertour-ui/types';
import { useAppContext } from '@/contexts/app-context';
import { CircleIcon, DisconnectIcon, EditIcon, SpinnerIcon } from '@usertour-ui/icons';
import { ArrowRightIcon, DotsVerticalIcon } from '@radix-ui/react-icons';
import { DropdownMenuItem } from '@usertour-ui/dropdown-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@usertour-ui/dropdown-menu';
import { Integration, integrations } from '@/utils/integration';
import { useLocation, useNavigate } from 'react-router-dom';

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
            <span className="text-xs text-muted-foreground">Syncing</span>
          </div>
        )}
      </div>
      <div className="mt-1">{integration.description}</div>
    </li>
  );
};

interface BaseIntegrationConfig {
  region?: string;
}

interface SalesforceIntegrationConfig extends BaseIntegrationConfig {
  // Add Salesforce specific config
}

interface IntegrationConfigProps<T extends BaseIntegrationConfig = BaseIntegrationConfig> {
  integration: Integration;
  onClose: () => void;
  onSubmit: (config: {
    key: string;
    enabled: boolean;
    config?: T;
  }) => Promise<void>;
  loading: boolean;
  integrationsData?: IntegrationModel[];
}

const SalesforceConfig = ({
  integration,
  onClose,
  onSubmit,
  loading,
  integrationsData,
}: IntegrationConfigProps<SalesforceIntegrationConfig>) => {
  const { environment } = useAppContext();
  const { toast } = useToast();
  const currentIntegration = integrationsData?.find((i) => i.code === integration.code);
  const isConnected = currentIntegration?.enabled;
  const { data: authUrl, loading: loadingAuthUrl } = useGetSalesforceAuthUrlQuery(
    environment?.id || '',
    integration.code,
    {
      skip: !environment?.id || isConnected,
    },
  );

  const handleConnect = async () => {
    if (!authUrl) {
      toast({
        title: 'Error',
        description: 'Failed to get Salesforce auth URL',
        variant: 'destructive',
      });
      return;
    }

    // Redirect to Salesforce auth page
    window.location.href = authUrl;
  };

  const handleSubmit = async () => {
    if (!currentIntegration) return;

    try {
      await onSubmit({
        key: currentIntegration.key,
        enabled: true,
        config: currentIntegration.config,
      });
      toast({
        title: 'Success',
        description: 'Salesforce integration updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update Salesforce integration',
        variant: 'destructive',
      });
    }
  };

  if (!isConnected) {
    return (
      <DialogContent className="max-w-2xl">
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
            <div className="mt-4 text-center text-lg/6 font-semibold">
              Connect {integration.name}
            </div>
          </DialogTitle>
          <DialogDescription className="mt-2 text-center">
            {integration.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="text-sm text-muted-foreground">
            Click the button below to connect your Salesforce account. You will be redirected to
            Salesforce to authorize the connection.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={loadingAuthUrl}>
            {loadingAuthUrl ? 'Loading...' : 'Connect to Salesforce'}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-2xl">
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
          <div className="mt-4 text-center text-lg/6 font-semibold">
            Edit {integration.name} Connection
          </div>
        </DialogTitle>
        <DialogDescription className="mt-2 text-center">
          {integration.description}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <CircleIcon className="w-3 h-3 text-success" />
            <span className="text-sm text-muted-foreground">Syncing</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Your Salesforce account is connected. You can disconnect or reconnect at any time.
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

// Configuration mapping for different integration types
const integrationConfigs: Record<string, React.ComponentType<IntegrationConfigProps>> = {
  salesforce: SalesforceConfig,
  'salesforce-sandbox': SalesforceConfig,
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
    <DialogContent className="max-w-2xl">
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
  const [connectingCode, setConnectingCode] = useState<string | null>(null);
  const { toast } = useToast();
  const { environment } = useAppContext();
  const location = useLocation();

  const environmentId = environment?.id || '';
  const {
    data: integrationsData,
    refetch,
    loading: loadingIntegrations,
  } = useListIntegrationsQuery(environmentId);
  const { invoke: updateIntegration, loading: updating } = useUpdateIntegrationMutation();
  const navigate = useNavigate();

  const handleConnect = async (code: string) => {
    setConnectingCode(code);
    try {
      const currentIntegration = integrationsData?.find((i: IntegrationModel) => i.code === code);
      if (!currentIntegration) {
        await updateIntegration(environmentId, code, {
          enabled: true,
          key: code,
          config: {},
        });
        await refetch();
      }
      navigate(`${location.pathname}/${code}`);
    } finally {
      setConnectingCode(null);
    }
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
    config?: {
      region?: string;
      streamEvents?: boolean;
    };
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
          // const isEnabled =
          //   integrationsData?.find((i: IntegrationModel) => i.code === integration.code)?.enabled ??
          //   false;
          const isLoading = updating && selectedCode === integration.code;
          const isDisabled = integration.disabled;
          if (isDisabled) return null;

          return (
            <IntegrationCard
              key={integration.name}
              integration={integration}
              enabled={false}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              loading={isLoading || loadingIntegrations || connectingCode === integration.code}
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
