import { Button } from '@usertour-packages/button';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@usertour-packages/dialog';
import { useCallback, useState, useMemo } from 'react';
import {
  useListIntegrationsQuery,
  useUpdateIntegrationMutation,
  useGetSalesforceAuthUrlQuery,
} from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { IntegrationModel } from '@usertour/types';
import { useAppContext } from '@/contexts/app-context';
import { CircleIcon, SpinnerIcon } from '@usertour-packages/icons';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Integration, integrations } from '@/utils/integration';
import { useLocation, useNavigate } from 'react-router-dom';

// Types
interface IntegrationCardProps {
  integration: Integration;
  isSyncing?: boolean;
  onClick: (provider: string) => void;
  loading?: boolean;
  isEnabled?: boolean;
}

interface IntegrationConfigProps {
  integration: Integration;
  integrationsData?: IntegrationModel[];
}

// Extracted components
const IntegrationCard = ({
  integration,
  isSyncing,
  onClick,
  loading,
  isEnabled,
}: IntegrationCardProps) => {
  const buttonText = useMemo(() => {
    if (loading) return '';
    if (integration.needsConnect && !isEnabled) return 'Connect';
    return 'Manage';
  }, [integration.needsConnect, isEnabled, loading]);

  return (
    <li className="cursor-default rounded-lg border border-input px-4 py-6 text-sm">
      <div className="flex items-center justify-between">
        <img
          className="bg-accent object-cover data-[loaded]:bg-transparent h-8 w-8 rounded-lg border border-accent-light"
          src={integration.imagePath}
          alt={`${integration.name} logo`}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onClick(integration.provider)}
          disabled={loading}
        >
          {loading ? <SpinnerIcon className="h-4 w-4 animate-spin mr-2" /> : buttonText}
        </Button>
      </div>
      <div className="mt-2 font-medium flex items-center">
        <span>{integration.name}</span>
        {isSyncing && (
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

const SalesforceConfig = ({ integration, integrationsData }: IntegrationConfigProps) => {
  const { environment } = useAppContext();
  const { toast } = useToast();
  const currentIntegration = useMemo(
    () => integrationsData?.find((i: IntegrationModel) => i.provider === integration.provider),
    [integrationsData, integration.provider],
  );
  const isConnected = currentIntegration?.enabled;

  const { data: authUrl, loading: loadingAuthUrl } = useGetSalesforceAuthUrlQuery(
    environment?.id || '',
    integration.provider,
    {
      skip: !environment?.id || isConnected,
    },
  );

  const handleConnect = useCallback(async () => {
    if (!authUrl) {
      toast({
        title: 'Error',
        description: 'Failed to get Salesforce auth URL',
        variant: 'destructive',
      });
      return;
    }

    window.location.href = authUrl;
  }, [authUrl, toast]);

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="flex flex-col gap-2 pt-4">
          <div className="flex items-center justify-center gap-x-4">
            <div className="h-12 w-12 rounded-lg border border-accent-light p-1.5">
              <img src="/images/logo.png" className="w-full h-full" alt="Logo" />
            </div>
            <DotsHorizontalIcon className="w-6 h-6" />
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
      <div className="text-sm text-muted-foreground">
        Connect your Salesforce account to Usertour to enable real-time synchronization. Once
        connected, you can sync Salesforce fields with Usertour, stream Usertour events into
        Salesforce as Timeline Events, and use these events to trigger automated workflows.
      </div>
      <DialogFooter>
        <DialogClose>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button onClick={handleConnect} disabled={loadingAuthUrl}>
          {loadingAuthUrl ? 'Loading...' : 'Connect to Salesforce'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

// Configuration mapping for different integration types
const integrationConfigs: Record<string, React.ComponentType<IntegrationConfigProps>> = {
  salesforce: SalesforceConfig,
  'salesforce-sandbox': SalesforceConfig,
};

export const IntegrationsListContent = () => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const { environment } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const environmentId = environment?.id || '';
  const {
    data: integrationsData,
    refetch,
    loading: loadingIntegrations,
  } = useListIntegrationsQuery(environmentId);
  const { invoke: updateIntegration, loading: updating } = useUpdateIntegrationMutation();

  const handleIntegrationUpdate = useCallback(
    async (provider: string, enabled: boolean) => {
      try {
        await updateIntegration(environmentId, provider, {
          enabled,
        });
        await refetch();
      } catch (error) {
        toast({
          title: 'Error',
          description: `Failed to ${enabled ? 'enable' : 'disable'} integration`,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [environmentId, updateIntegration, refetch, toast],
  );

  const handleOnClick = useCallback(
    async (provider: string) => {
      setConnectingProvider(provider);
      try {
        const integration = integrations.find((i) => i.provider === provider);
        const currentIntegration = integrationsData?.find(
          (i: IntegrationModel) => i.provider === provider,
        );

        if (integration?.needsConnect) {
          if (!currentIntegration) {
            await handleIntegrationUpdate(provider, false);
          }

          if (currentIntegration?.enabled) {
            navigate(`${location.pathname}/${provider}`);
          } else {
            setSelectedProvider(provider);
          }
          return;
        }

        if (!currentIntegration || !currentIntegration.enabled) {
          await handleIntegrationUpdate(provider, true);
        }
        navigate(`${location.pathname}/${provider}`);
      } catch (error) {
        console.error('Failed to handle integration click:', error);
      } finally {
        setConnectingProvider(null);
      }
    },
    [integrationsData, handleIntegrationUpdate, navigate, location.pathname],
  );

  const selectedIntegration = useMemo(
    () => (selectedProvider ? integrations.find((i) => i.provider === selectedProvider) : null),
    [selectedProvider],
  );

  const ConfigComponent = useMemo(
    () => (selectedIntegration && selectedProvider ? integrationConfigs[selectedProvider] : null),
    [selectedIntegration, selectedProvider],
  );

  const filteredIntegrations = useMemo(
    () => integrations.filter((integration) => !integration.disabled),
    [],
  );

  return (
    <>
      <ul className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {filteredIntegrations.map((integration) => {
          const currentIntegration = integrationsData?.find(
            (i: IntegrationModel) => i.provider === integration.provider,
          );
          const isSyncing =
            currentIntegration?.config?.exportEvents ||
            currentIntegration?.config?.syncCohorts ||
            (currentIntegration?.provider === 'salesforce-sandbox' && currentIntegration.enabled) ||
            (currentIntegration?.provider === 'salesforce' && currentIntegration.enabled);
          const isLoading = updating && selectedProvider === integration.provider;
          const isEnabled = currentIntegration?.enabled;

          return (
            <IntegrationCard
              key={integration.name}
              integration={integration}
              isSyncing={isSyncing}
              onClick={handleOnClick}
              loading={
                isLoading || loadingIntegrations || connectingProvider === integration.provider
              }
              isEnabled={isEnabled}
            />
          );
        })}
      </ul>

      <Dialog open={!!selectedProvider} onOpenChange={() => setSelectedProvider(null)}>
        {selectedIntegration && ConfigComponent && (
          <ConfigComponent integration={selectedIntegration} integrationsData={integrationsData} />
        )}
      </Dialog>
    </>
  );
};
