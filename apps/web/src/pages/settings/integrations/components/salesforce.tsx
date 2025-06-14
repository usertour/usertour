import { Button } from '@usertour-ui/button';
import { useState, useCallback, useEffect } from 'react';
import {
  useGetIntegrationQuery,
  useGetSalesforceAuthUrlQuery,
  useUpdateIntegrationMutation,
} from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';
import { useAppContext } from '@/contexts/app-context';
import { Switch } from '@usertour-ui/switch';
import { Label } from '@usertour-ui/label';
import { QuestionTooltip } from '@usertour-ui/tooltip';
import { integrations } from '@/utils/integration';
import { IntegrationModel } from '@usertour-ui/types';
import { Card, CardDescription } from '@usertour-ui/card';
import { CardHeader, CardTitle } from '@usertour-ui/card';
import { CardContent } from '@usertour-ui/card';
import { DotsVerticalIcon } from '@radix-ui/react-icons';
import { Skeleton } from '@usertour-ui/skeleton';
import { ConnectIcon, DisconnectIcon, SpinnerIcon } from '@usertour-ui/icons';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { DropdownMenu } from '@usertour-ui/dropdown-menu';

interface SalesforceIntegrationConfig {
  syncAccounts?: boolean;
  syncContacts?: boolean;
  syncLeads?: boolean;
  syncOpportunities?: boolean;
}

interface IntegrationFormProps {
  integration: IntegrationModel | undefined;
  currentIntegration: IntegrationModel | undefined;
  onSave: (updates: Partial<SalesforceIntegrationConfig>) => Promise<void>;
  onUpdate: (updates: Partial<IntegrationModel>) => void;
  isLoading?: boolean;
}

const INTEGRATION_PROVIDER = 'salesforce' as const;

const SyncAccountsForm = ({
  integration,
  currentIntegration,
  onSave,
  onUpdate,
  isLoading,
}: IntegrationFormProps) => {
  const config = (integration?.config as SalesforceIntegrationConfig) || {};

  const hasChanges = useCallback(() => {
    if (!integration) return false;
    return integration.config?.syncAccounts !== currentIntegration?.config?.syncAccounts;
  }, [integration, currentIntegration]);

  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      if (!integration) return;
      // Update local state
      onUpdate({
        config: { ...integration.config, syncAccounts: checked },
      });
      // Auto save when switch is turned off
      if (!checked) {
        onSave({ syncAccounts: false });
      }
    },
    [integration, onUpdate, onSave],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex items-center gap-2 flex-row items-center">
          <Switch
            checked={config.syncAccounts}
            onCheckedChange={handleSwitchChange}
            className="data-[state=unchecked]:bg-input"
            disabled={isLoading}
          />
          <Label className="text-sm">Sync Salesforce Accounts</Label>
          <QuestionTooltip>
            When enabled, Salesforce accounts will be synced with Usertour.
          </QuestionTooltip>
        </CardTitle>
        <CardDescription>Configure account synchronization settings</CardDescription>
      </CardHeader>
      {config.syncAccounts && (
        <CardContent className="flex flex-col gap-4">
          <Button disabled={!hasChanges() || isLoading} className="w-24" onClick={() => onSave({})}>
            {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </CardContent>
      )}
    </Card>
  );
};

const SyncContactsForm = ({
  integration,
  currentIntegration,
  onSave,
  onUpdate,
  isLoading,
}: IntegrationFormProps) => {
  const config = (integration?.config as SalesforceIntegrationConfig) || {};

  const hasChanges = useCallback(() => {
    if (!integration) return false;
    return integration.config?.syncContacts !== currentIntegration?.config?.syncContacts;
  }, [integration, currentIntegration]);

  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      if (!integration) return;
      // Update local state
      onUpdate({
        config: { ...integration.config, syncContacts: checked },
      });
      // Auto save when switch is turned off
      if (!checked) {
        onSave({ syncContacts: false });
      }
    },
    [integration, onUpdate, onSave],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex items-center gap-2 flex-row items-center">
          <Switch
            checked={config.syncContacts}
            onCheckedChange={handleSwitchChange}
            className="data-[state=unchecked]:bg-input"
            disabled={isLoading}
          />
          <Label className="text-sm">Sync Salesforce Contacts</Label>
          <QuestionTooltip>
            When enabled, Salesforce contacts will be synced with Usertour.
          </QuestionTooltip>
        </CardTitle>
        <CardDescription>Configure contact synchronization settings</CardDescription>
      </CardHeader>
      {config.syncContacts && (
        <CardContent className="flex flex-col gap-4">
          <Button disabled={!hasChanges() || isLoading} className="w-24" onClick={() => onSave({})}>
            {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </CardContent>
      )}
    </Card>
  );
};

const SyncLeadsForm = ({
  integration,
  currentIntegration,
  onSave,
  onUpdate,
  isLoading,
}: IntegrationFormProps) => {
  const config = (integration?.config as SalesforceIntegrationConfig) || {};

  const hasChanges = useCallback(() => {
    if (!integration) return false;
    return integration.config?.syncLeads !== currentIntegration?.config?.syncLeads;
  }, [integration, currentIntegration]);

  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      if (!integration) return;
      // Update local state
      onUpdate({
        config: { ...integration.config, syncLeads: checked },
      });
      // Auto save when switch is turned off
      if (!checked) {
        onSave({ syncLeads: false });
      }
    },
    [integration, onUpdate, onSave],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex items-center gap-2 flex-row items-center">
          <Switch
            checked={config.syncLeads}
            onCheckedChange={handleSwitchChange}
            className="data-[state=unchecked]:bg-input"
            disabled={isLoading}
          />
          <Label className="text-sm">Sync Salesforce Leads</Label>
          <QuestionTooltip>
            When enabled, Salesforce leads will be synced with Usertour.
          </QuestionTooltip>
        </CardTitle>
        <CardDescription>Configure lead synchronization settings</CardDescription>
      </CardHeader>
      {config.syncLeads && (
        <CardContent className="flex flex-col gap-4">
          <Button disabled={!hasChanges() || isLoading} className="w-24" onClick={() => onSave({})}>
            {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </CardContent>
      )}
    </Card>
  );
};

const SyncOpportunitiesForm = ({
  integration,
  currentIntegration,
  onSave,
  onUpdate,
  isLoading,
}: IntegrationFormProps) => {
  const config = (integration?.config as SalesforceIntegrationConfig) || {};

  const hasChanges = useCallback(() => {
    if (!integration) return false;
    return integration.config?.syncOpportunities !== currentIntegration?.config?.syncOpportunities;
  }, [integration, currentIntegration]);

  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      if (!integration) return;
      // Update local state
      onUpdate({
        config: { ...integration.config, syncOpportunities: checked },
      });
      // Auto save when switch is turned off
      if (!checked) {
        onSave({ syncOpportunities: false });
      }
    },
    [integration, onUpdate, onSave],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex items-center gap-2 flex-row items-center">
          <Switch
            checked={config.syncOpportunities}
            onCheckedChange={handleSwitchChange}
            className="data-[state=unchecked]:bg-input"
            disabled={isLoading}
          />
          <Label className="text-sm">Sync Salesforce Opportunities</Label>
          <QuestionTooltip>
            When enabled, Salesforce opportunities will be synced with Usertour.
          </QuestionTooltip>
        </CardTitle>
        <CardDescription>Configure opportunity synchronization settings</CardDescription>
      </CardHeader>
      {config.syncOpportunities && (
        <CardContent className="flex flex-col gap-4">
          <Button disabled={!hasChanges() || isLoading} className="w-24" onClick={() => onSave({})}>
            {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </CardContent>
      )}
    </Card>
  );
};

const SyncAccountsFormSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle className="space-between flex items-center gap-2 flex-row items-center">
        <Skeleton className="h-6 w-10" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-6 w-6" />
      </CardTitle>
      <div className="text-sm text-muted-foreground">
        <Skeleton className="h-4 w-48" />
      </div>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <Skeleton className="h-10 w-24" />
    </CardContent>
  </Card>
);

export const SalesforceIntegration = () => {
  const { environment } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const environmentId = environment?.id || '';

  const {
    data: currentIntegration,
    refetch,
    loading: isDataLoading,
  } = useGetIntegrationQuery(environment?.id || '', INTEGRATION_PROVIDER, {
    skip: !environment?.id,
  });

  const [integration, setIntegration] = useState<IntegrationModel | undefined>(currentIntegration);

  useEffect(() => {
    setIntegration(currentIntegration);
  }, [currentIntegration]);

  const { invoke: updateIntegration } = useUpdateIntegrationMutation();

  const integrationInfo = integrations.find((i) => i.provider === INTEGRATION_PROVIDER);

  const { data: authUrl, loading: loadingAuthUrl } = useGetSalesforceAuthUrlQuery(
    environment?.id || '',
    INTEGRATION_PROVIDER,
    {
      skip: !environment?.id,
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

  const handleSave = useCallback(
    async (updates: Partial<SalesforceIntegrationConfig>) => {
      try {
        setIsLoading(true);
        await updateIntegration(environmentId, INTEGRATION_PROVIDER, {
          enabled: true,
          key: integration?.key || '',
          config: {
            ...integration?.config,
            ...updates,
          },
        });
        toast({
          title: 'Settings saved successfully',
        });
        refetch();
      } catch {
        toast({
          title: 'Failed to save settings',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [environmentId, integration, updateIntegration, toast, refetch],
  );

  const handleUpdate = useCallback((updates: Partial<IntegrationModel>) => {
    setIntegration((prev: IntegrationModel | undefined) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updates,
      };
    });
  }, []);

  if (isDataLoading) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="space-between flex items-center gap-4 flex-row items-center">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
        <SyncAccountsFormSkeleton />
        <SyncAccountsFormSkeleton />
        <SyncAccountsFormSkeleton />
        <SyncAccountsFormSkeleton />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex items-center gap-4 flex-row items-center relative">
            <img
              src={integrationInfo?.imagePath}
              alt={`${integrationInfo?.name} logo`}
              className="w-12 h-12"
            />
            <div className="flex flex-col gap-1">
              <span className="text-lg font-semibold">{integrationInfo?.name}</span>
              <div className="text-sm text-muted-foreground font-normal">
                Connected as{' '}
                <span className="font-bold text-foreground ">
                  {integration?.integrationOAuth?.data?.email}
                </span>{' '}
                at{' '}
                <span className="font-bold text-foreground">
                  {integration?.integrationOAuth?.data?.organizationName}
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 absolute right-0 top-0"
                  disabled={loadingAuthUrl}
                >
                  <DotsVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem className="cursor-pointer" onClick={handleConnect}>
                  <ConnectIcon className="mr-1 w-4 h-4" />
                  Reconnect
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600 cursor-pointer">
                  <DisconnectIcon className="mr-1 w-4 h-4" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardTitle>
        </CardHeader>
      </Card>

      <SyncAccountsForm
        integration={integration}
        currentIntegration={currentIntegration}
        onSave={handleSave}
        onUpdate={handleUpdate}
        isLoading={isLoading}
      />

      <SyncContactsForm
        integration={integration}
        currentIntegration={currentIntegration}
        onSave={handleSave}
        onUpdate={handleUpdate}
        isLoading={isLoading}
      />

      <SyncLeadsForm
        integration={integration}
        currentIntegration={currentIntegration}
        onSave={handleSave}
        onUpdate={handleUpdate}
        isLoading={isLoading}
      />

      <SyncOpportunitiesForm
        integration={integration}
        currentIntegration={currentIntegration}
        onSave={handleSave}
        onUpdate={handleUpdate}
        isLoading={isLoading}
      />
    </>
  );
};

SalesforceIntegration.displayName = 'SalesforceIntegration';
