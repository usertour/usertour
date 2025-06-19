import { Button } from '@usertour-ui/button';
import { useState, useCallback, useEffect } from 'react';
import {
  useGetIntegrationQuery,
  useGetSalesforceAuthUrlQuery,
  useUpdateIntegrationMutation,
  useDisconnectIntegrationMutation,
  useGetSalesforceObjectFieldsQuery,
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
import {
  ConnectIcon,
  DisconnectIcon,
  SpinnerIcon,
  PlusIcon,
  ArrowRightIcon,
} from '@usertour-ui/icons';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { DropdownMenu } from '@usertour-ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@usertour-ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour-ui/select';
import { useNavigate } from 'react-router-dom';

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

const MappingSetupButton = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer">
          <CardContent className="flex items-center justify-center p-6">
            <div className="flex items-center gap-2">
              <PlusIcon className="h-6 w-6" />
              <span className="text-sm text-muted-foreground">
                Set up a new mapping between Salesforce and Usertour objects
              </span>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <MappingSetupDialog onClose={() => setIsDialogOpen(false)} />
    </Dialog>
  );
};

interface MappingSetupDialogProps {
  onClose: () => void;
}

const MappingSetupDialog = ({ onClose }: MappingSetupDialogProps) => {
  const { environment } = useAppContext();
  const { toast } = useToast();
  const [step, setStep] = useState<'objects' | 'fields'>('objects');
  const [salesforceObject, setSalesforceObject] = useState<string>('');
  const [usertourObject, setUsertourObject] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Get the integration ID from the current integration
  const { data: integration } = useGetIntegrationQuery(environment?.id || '', 'salesforce', {
    skip: !environment?.id,
  });

  const { data: objectFields } = useGetSalesforceObjectFieldsQuery(integration?.id || '', {
    skip: !integration?.id,
  });

  const salesforceObjects = [
    { name: 'Contact', label: 'Contacts', type: 'standard' as const },
    { name: 'Account', label: 'Accounts', type: 'standard' as const },
    { name: 'Lead', label: 'Leads', type: 'standard' as const },
    { name: 'Opportunity', label: 'Opportunities', type: 'standard' as const },
  ];

  const usertourObjects = [
    { name: 'BizUser', label: 'User' },
    { name: 'BizCompany', label: 'Company' },
  ];

  const selectedSalesforceObject = salesforceObjects.find((obj) => obj.name === salesforceObject);
  const selectedSalesforceFields = selectedSalesforceObject
    ? objectFields?.standardObjects?.find((obj: any) => obj.name === salesforceObject)?.fields || []
    : [];

  const handleContinue = () => {
    if (!salesforceObject || !usertourObject) {
      toast({
        title: 'Error',
        description: 'Please select both Salesforce and Usertour objects',
        variant: 'destructive',
      });
      return;
    }
    setStep('fields');
  };

  const handleBack = () => {
    setStep('objects');
  };

  const handleCreateMapping = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement mapping creation using the new hooks
      console.log('Creating mapping:', { salesforceObject, usertourObject });

      toast({
        title: 'Success',
        description: 'Object mapping created successfully',
      });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create object mapping',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('objects');
    setSalesforceObject('');
    setUsertourObject('');
    onClose();
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {step === 'objects' ? 'Select Objects' : 'Configure Field Mapping'}
        </DialogTitle>
        <DialogDescription>
          {step === 'objects'
            ? 'Choose which Salesforce object to map to which Usertour object.'
            : `Configure how ${selectedSalesforceObject?.label} fields map to ${usertourObject} fields.`}
        </DialogDescription>
      </DialogHeader>

      {step === 'objects' ? (
        <>
          <div className="space-y-1 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="salesforce-object">Salesforce Object</Label>
              </div>
              <div className="w-6" />
              <div className="flex-1">
                <Label htmlFor="usertour-object">Usertour Object</Label>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select value={salesforceObject} onValueChange={setSalesforceObject}>
                  <SelectTrigger id="salesforce-object">
                    <SelectValue placeholder="Select Salesforce object" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesforceObjects.map((obj) => (
                      <SelectItem key={obj.name} value={obj.name}>
                        <div className="flex items-center gap-2">
                          <span>{obj.label}</span>
                          <div className="text-xs text-muted-foreground">Standard Object</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRightIcon className="h-6 w-6 text-muted-foreground" />
              </div>

              <div className="flex-1">
                <Select value={usertourObject} onValueChange={setUsertourObject}>
                  <SelectTrigger id="usertour-object">
                    <SelectValue placeholder="Select Usertour object" />
                  </SelectTrigger>
                  <SelectContent>
                    {usertourObjects.map((obj) => (
                      <SelectItem key={obj.name} value={obj.name}>
                        {obj.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleContinue} disabled={!salesforceObject || !usertourObject}>
              Continue
            </Button>
          </DialogFooter>
        </>
      ) : (
        <>
          <div className="py-4">
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">
                {selectedSalesforceObject?.label} →{' '}
                {usertourObjects.find((obj) => obj.name === usertourObject)?.label}
              </div>
              <div className="text-xs text-muted-foreground">Standard Object</div>
            </div>

            <div className="space-y-3">
              <Label>Available Fields</Label>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {selectedSalesforceFields.map((field: any) => (
                  <div
                    key={field.name}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <div className="text-sm font-medium">{field.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {field.name} ({field.type})
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {field.required ? 'Required' : 'Optional'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleBack} disabled={isLoading}>
              Back
            </Button>
            <Button onClick={handleCreateMapping} disabled={isLoading}>
              {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              Create Mapping
            </Button>
          </DialogFooter>
        </>
      )}
    </DialogContent>
  );
};

export const SalesforceIntegration = () => {
  const { environment } = useAppContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

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
  const { invoke: disconnectIntegration } = useDisconnectIntegrationMutation();

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

  const handleDisconnect = useCallback(async () => {
    try {
      setIsDisconnecting(true);
      await disconnectIntegration(environmentId, INTEGRATION_PROVIDER);
      toast({
        title: 'Success',
        description: 'Successfully disconnected from Salesforce',
      });
      navigate('/project/1/settings/integrations');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to disconnect from Salesforce',
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  }, [environmentId, disconnectIntegration, toast, navigate]);

  const handleSave = useCallback(
    async (updates: Partial<SalesforceIntegrationConfig>) => {
      try {
        setIsLoading(true);
        await updateIntegration(environmentId, INTEGRATION_PROVIDER, {
          enabled: true,
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
              <span className="text-lg font-semibold">{integrationInfo?.name} connection</span>
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
                  disabled={loadingAuthUrl || isDisconnecting}
                >
                  <DotsVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem className="cursor-pointer" onClick={handleConnect}>
                  <ConnectIcon className="mr-1 w-4 h-4" />
                  Reconnect
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <SpinnerIcon className="mr-1 w-4 h-4 animate-spin" />
                  ) : (
                    <DisconnectIcon className="mr-1 w-4 h-4" />
                  )}
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardTitle>
        </CardHeader>
      </Card>

      <MappingSetupButton />

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
