import { Button } from '@usertour-ui/button';
import { useState, useCallback } from 'react';
import {
  useGetIntegrationQuery,
  useGetSalesforceAuthUrlQuery,
  useDisconnectIntegrationMutation,
  useGetSalesforceObjectFieldsQuery,
} from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';
import { useAppContext } from '@/contexts/app-context';
import { integrations } from '@/utils/integration';
import { Card } from '@usertour-ui/card';
import { CardHeader, CardTitle } from '@usertour-ui/card';
import { CardContent } from '@usertour-ui/card';
import { DotsVerticalIcon } from '@radix-ui/react-icons';
import { Skeleton } from '@usertour-ui/skeleton';
import {
  ConnectIcon,
  DisconnectIcon,
  SpinnerIcon,
  PlusIcon,
  SalesforceIcon,
  UsertourIcon2,
  ArrowRightLeftIcon,
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@usertour-ui/dialog';
import { useNavigate } from 'react-router-dom';
import { cn } from '@usertour-ui/ui-utils';
import { AttributeBizTypes } from '@usertour-ui/types';
import { ObjectMappingPanel } from './object-mapping/object-mapping-panel';
import { ObjectMappingObjectSelect } from './object-mapping/object-mapping-select';
import { Label } from '@usertour-ui/label';
import { Switch } from '@usertour-ui/switch';
import { InfoIcon } from 'lucide-react';

const SalesforceMappingIcon = ({ className }: { className?: string }) => (
  <SalesforceIcon className={cn('w-4 h-4', className)} />
);

const UsertourMappingIcon = ({ className }: { className?: string }) => (
  <UsertourIcon2 className={cn('w-4 h-4 text-primary', className)} />
);

const salesforceObjects = [
  { name: 'Contact', label: 'Contacts', type: 'standard' as const },
  { name: 'Account', label: 'Accounts', type: 'standard' as const },
  { name: 'Lead', label: 'Leads', type: 'standard' as const },
  { name: 'Opportunity', label: 'Opportunities', type: 'standard' as const },
];

const usertourObjects = [
  { name: 'User', label: 'User' },
  { name: 'Company', label: 'Company' },
];

interface ObjectSelectionPanelProps {
  salesforceObject: string;
  usertourObject: string;
  onSalesforceObjectChange: (value: string) => void;
  onUsertourObjectChange: (value: string) => void;
  onContinue: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const ObjectSelectionPanel = (props: ObjectSelectionPanelProps) => {
  const {
    salesforceObject,
    usertourObject,
    onSalesforceObjectChange,
    onUsertourObjectChange,
    onContinue,
    onCancel,
    isLoading,
  } = props;
  return (
    <>
      <div className="space-y-1 py-4">
        <div className="flex items-center gap-4 justify-between">
          <Label htmlFor="salesforce-object" className="w-72">
            Salesforce Object
          </Label>
          <div className="w-6" />
          <Label htmlFor="usertour-object" className="w-72">
            Usertour Object
          </Label>
        </div>

        <div className="flex items-center gap-4 justify-between">
          <ObjectMappingObjectSelect
            items={salesforceObjects}
            value={salesforceObject}
            onValueChange={onSalesforceObjectChange}
            placeholder="Select Salesforce object"
          />

          <div className="flex items-center justify-center">
            <ArrowRightLeftIcon className="h-6 w-6 " />
          </div>

          <ObjectMappingObjectSelect
            items={usertourObjects}
            value={usertourObject}
            onValueChange={onUsertourObjectChange}
            placeholder="Select Usertour object"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={onContinue} disabled={!salesforceObject || !usertourObject}>
          Continue
        </Button>
      </DialogFooter>
    </>
  );
};

export function MappingSetupDialog({ onClose }: { onClose: () => void }) {
  const { environment, project } = useAppContext();
  const { toast } = useToast();
  const [step, setStep] = useState<'objects' | 'fields'>('objects');
  const [salesforceObject, setSalesforceObject] = useState<string>('');
  const [usertourObject, setUsertourObject] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [stream, setStream] = useState(false);

  // Get the integration ID from the current integration
  const { data: integration } = useGetIntegrationQuery(environment?.id || '', 'salesforce', {
    skip: !environment?.id,
  });

  const { data: objectFields } = useGetSalesforceObjectFieldsQuery(integration?.id || '', {
    skip: !integration?.id,
  });

  // Get attributes based on selected usertour object type
  const selectedBizType =
    usertourObject === 'User'
      ? AttributeBizTypes.User
      : usertourObject === 'Company'
        ? AttributeBizTypes.Company
        : AttributeBizTypes.User; // Default to User when no object selected

  const selectedSalesforceObject = salesforceObject ? { name: salesforceObject } : null;
  const selectedSalesforceFields = selectedSalesforceObject
    ? objectFields?.standardObjects?.find((obj: any) => obj.name === salesforceObject)?.fields || []
    : [];

  // Convert API field data to UI format
  const dynamicSalesforceFields = selectedSalesforceFields.map((field: any) => ({
    value: field.name,
    label: field.label || field.name,
    icon: <SalesforceMappingIcon />,
  }));

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

  const handleCreateMapping = async (mappingData: any) => {
    try {
      setIsLoading(true);
      // TODO: Implement mapping creation using the new hooks
      console.log('Creating mapping:', {
        salesforceObject,
        usertourObject,
        mappingData,
        stream,
      });

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
    <DialogContent className={cn('max-w-2xl', step === 'objects' ? 'max-w-2xl' : 'max-w-4xl')}>
      <DialogHeader>
        <DialogTitle>
          {step === 'objects' && 'Select Objects'}

          {step !== 'objects' && (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <SalesforceMappingIcon className="w-6 h-6" /> Contact
              </span>
              <ArrowRightLeftIcon className="w-6 h-6" />
              <span className="flex items-center gap-1">
                <UsertourMappingIcon className="w-6 h-6" /> User
              </span>
            </div>
          )}
        </DialogTitle>
        <DialogDescription>
          {step === 'objects' && 'Choose which Salesforce object to map to which Usertour object.'}
        </DialogDescription>
      </DialogHeader>

      {step === 'objects' ? (
        <ObjectSelectionPanel
          salesforceObject={salesforceObject}
          usertourObject={usertourObject}
          onSalesforceObjectChange={setSalesforceObject}
          onUsertourObjectChange={setUsertourObject}
          onContinue={handleContinue}
          onCancel={handleClose}
          isLoading={isLoading}
        />
      ) : (
        <>
          <ObjectMappingPanel
            selectedBizType={selectedBizType}
            projectId={project?.id || ''}
            sourceFields={dynamicSalesforceFields}
          />

          {/* Stream events switch - business specific */}
          <div className="flex items-center gap-3 mb-4">
            <Switch checked={stream} onCheckedChange={setStream} />
            <span>
              Stream <span className="font-semibold text-primary">User events</span>
              <span className="mx-1">→</span>
              <span className="font-semibold text-blue-500">Contact activity</span>
            </span>
            <InfoIcon className="w-4 h-4 text-muted-foreground" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleBack} disabled={isLoading}>
              Back
            </Button>
            <Button onClick={handleCreateMapping} disabled={isLoading}>
              {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              Save mapping
            </Button>
          </DialogFooter>
        </>
      )}
    </DialogContent>
  );
}

const INTEGRATION_PROVIDER = 'salesforce' as const;

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

export const SalesforceIntegration = () => {
  const { environment } = useAppContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const environmentId = environment?.id || '';

  const { data: currentIntegration, loading: isDataLoading } = useGetIntegrationQuery(
    environment?.id || '',
    INTEGRATION_PROVIDER,
    {
      skip: !environment?.id,
    },
  );

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
        <MappingSetupButton />
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
                  {currentIntegration?.integrationOAuth?.data?.email}
                </span>{' '}
                at{' '}
                <span className="font-bold text-foreground">
                  {currentIntegration?.integrationOAuth?.data?.organizationName}
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
    </>
  );
};

SalesforceIntegration.displayName = 'SalesforceIntegration';
