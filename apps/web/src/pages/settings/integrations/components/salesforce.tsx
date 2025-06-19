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
import { DotsVerticalIcon, CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { Skeleton } from '@usertour-ui/skeleton';
import {
  ConnectIcon,
  DisconnectIcon,
  SpinnerIcon,
  PlusIcon,
  SalesforceIcon,
  UsertourIcon2,
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
import { useNavigate } from 'react-router-dom';
import { Switch } from '@usertour-ui/switch';
import { XIcon, InfoIcon, ArrowRightIcon } from 'lucide-react';
import { Label } from '@usertour-ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-ui/command';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { cn } from '@usertour-ui/ui-utils';

const SalesforceMappingIcon = () => <SalesforceIcon className="w-4 h-4" />;
const UsertourMappingIcon = () => <UsertourIcon2 className="w-4 h-4 text-primary" />;

// Example field options (replace with your real data)
const usertourFields = [
  { value: 'email', label: 'Email', icon: <UsertourMappingIcon /> },
  { value: 'title', label: 'Title', icon: <UsertourMappingIcon /> },
  { value: 'industry', label: 'Industry', icon: <UsertourMappingIcon /> },
];

interface CustomSelectProps {
  items: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

interface CustomObjectSelectProps {
  items: Array<{ name: string; label: string; type?: string }>;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

function CustomSelect({ items, value, onValueChange, placeholder, className }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((item) => item.value === value);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          className={cn('w-72 justify-between', className)}
        >
          {selectedItem ? (
            <div className="flex items-center gap-2">
              {selectedItem.icon}
              <span>{selectedItem.label}</span>
            </div>
          ) : (
            placeholder
          )}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 z-50" withoutPortal>
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandEmpty>No items found.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-64">
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={() => handleSelect(item.value)}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <CheckIcon
                    className={cn(
                      'ml-auto h-4 w-4',
                      value === item.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CustomObjectSelect({
  items,
  value,
  onValueChange,
  placeholder,
  className,
}: CustomObjectSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((item) => item.name === value);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          className={cn('w-72 justify-between', className)}
        >
          {selectedItem ? (
            <div className="flex items-center gap-2">
              <span>{selectedItem.label}</span>
              {selectedItem.type && (
                <div className="text-xs text-muted-foreground">{selectedItem.type}</div>
              )}
            </div>
          ) : (
            placeholder
          )}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 z-50" withoutPortal>
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandEmpty>No items found.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-64">
              {items.map((item) => (
                <CommandItem
                  key={item.name}
                  value={item.name}
                  onSelect={() => handleSelect(item.name)}
                >
                  <div className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.type && <div className="text-xs text-muted-foreground">{item.type}</div>}
                  </div>
                  <CheckIcon
                    className={cn(
                      'ml-auto h-4 w-4',
                      value === item.name ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function MappingSetupDialog({ onClose }: { onClose: () => void }) {
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

  // Convert API field data to UI format
  const dynamicSalesforceFields = selectedSalesforceFields.map((field: any) => ({
    value: field.name,
    label: field.label || field.name,
    icon: <SalesforceMappingIcon />,
  }));

  console.log(selectedSalesforceFields);

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
  // Object match fields
  const [matchLeft, setMatchLeft] = useState('email');
  const [matchRight, setMatchRight] = useState('email');

  // Field mappings state
  const [sfToUsertour, setSfToUsertour] = useState([
    { left: 'title', right: 'title', isNew: true },
    { left: 'industry', right: 'industry', isNew: true },
  ]);
  const [usertourToSf, setUsertourToSf] = useState([{ left: 'nps', right: 'nps', isNew: true }]);

  // Add row state
  const [addLeft, setAddLeft] = useState('');
  const [addRight, setAddRight] = useState('');
  const [addLeft2, setAddLeft2] = useState('');
  const [addRight2, setAddRight2] = useState('');

  // Stream events switch
  const [stream, setStream] = useState(false);

  // Add mapping from Salesforce to Usertour
  const addMapping = () => {
    if (addLeft && addRight) {
      setSfToUsertour([...sfToUsertour, { left: addLeft, right: addRight, isNew: true }]);
      setAddLeft('');
      setAddRight('');
    }
  };

  // Add mapping from Usertour to Salesforce
  const addMapping2 = () => {
    if (addLeft2 && addRight2) {
      setUsertourToSf([...usertourToSf, { left: addLeft2, right: addRight2, isNew: true }]);
      setAddLeft2('');
      setAddRight2('');
    }
  };

  // Remove mapping row
  const removeMapping = (idx: number, direction: string) => {
    if (direction === 'sfToUsertour') {
      setSfToUsertour(sfToUsertour.filter((_, i) => i !== idx));
    } else {
      setUsertourToSf(usertourToSf.filter((_, i) => i !== idx));
    }
  };

  return (
    <DialogContent className={cn('max-w-2xl', step === 'objects' ? 'max-w-2xl' : 'max-w-4xl')}>
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
              <CustomObjectSelect
                items={salesforceObjects}
                value={salesforceObject}
                onValueChange={setSalesforceObject}
                placeholder="Select Salesforce object"
              />

              <div className="flex items-center justify-center">
                <ArrowRightIcon className="h-6 w-6 text-muted-foreground" />
              </div>

              <CustomObjectSelect
                items={usertourObjects}
                value={usertourObject}
                onValueChange={setUsertourObject}
                placeholder="Select Usertour object"
              />
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
          <div>
            {/* Object match row */}
            <div className="flex items-center gap-2 mb-6">
              <span className="font-semibold flex items-center gap-1">
                <SalesforceMappingIcon /> Contact
              </span>
              <span className="mx-2 text-xl">↔</span>
              <span className="font-semibold flex items-center gap-1">
                <UsertourMappingIcon /> User
              </span>
            </div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Match objects by</span>
                <InfoIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <CustomSelect
                  items={dynamicSalesforceFields}
                  value={matchLeft}
                  onValueChange={setMatchLeft}
                  placeholder="Select field"
                />
                <span className="mx-2 text-lg">=</span>
                <CustomSelect
                  items={usertourFields}
                  value={matchRight}
                  onValueChange={setMatchRight}
                  placeholder="Select field"
                />
              </div>
            </div>

            {/* Fields to sync from Salesforce to Usertour */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Fields to sync from Salesforce to Usertour</span>
                <InfoIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              {sfToUsertour.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2 py-1">
                  <CustomSelect
                    items={dynamicSalesforceFields}
                    value={m.left}
                    onValueChange={(v) => {
                      const arr = [...sfToUsertour];
                      arr[idx].left = v;
                      setSfToUsertour(arr);
                    }}
                    placeholder="Select field"
                  />
                  <span className="mx-2 text-xl text-muted-foreground">→</span>
                  <CustomSelect
                    items={usertourFields}
                    value={m.right}
                    onValueChange={(v) => {
                      const arr = [...sfToUsertour];
                      arr[idx].right = v;
                      setSfToUsertour(arr);
                    }}
                    placeholder="Select field"
                  />
                  {m.isNew && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-primary/10 text-primary font-medium">
                      New
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMapping(idx, 'sfToUsertour')}
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {/* Add new mapping row */}
              <div className="flex items-center gap-2 py-1">
                <CustomSelect
                  items={dynamicSalesforceFields}
                  value={addLeft}
                  onValueChange={setAddLeft}
                  placeholder="Select a field to sync"
                />
                <span className="mx-2 text-xl text-muted-foreground">→</span>
                <CustomSelect
                  items={usertourFields}
                  value={addRight}
                  onValueChange={setAddRight}
                  placeholder="..."
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2"
                  disabled={!addLeft || !addRight}
                  onClick={addMapping}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Fields to sync from Usertour to Salesforce */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Fields to sync from Usertour to Salesforce</span>
                <InfoIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              {usertourToSf.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2 py-1">
                  <CustomSelect
                    items={usertourFields}
                    value={m.left}
                    onValueChange={(v) => {
                      const arr = [...usertourToSf];
                      arr[idx].left = v;
                      setUsertourToSf(arr);
                    }}
                    placeholder="Select field"
                  />
                  <span className="mx-2 text-xl text-muted-foreground">→</span>
                  <CustomSelect
                    items={dynamicSalesforceFields}
                    value={m.right}
                    onValueChange={(v) => {
                      const arr = [...usertourToSf];
                      arr[idx].right = v;
                      setUsertourToSf(arr);
                    }}
                    placeholder="Select field"
                  />
                  {m.isNew && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-primary/10 text-primary font-medium">
                      New
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMapping(idx, 'usertourToSf')}
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {/* Add new mapping row */}
              <div className="flex items-center gap-2 py-1">
                <CustomSelect
                  items={usertourFields}
                  value={addLeft2}
                  onValueChange={setAddLeft2}
                  placeholder="Select a field to sync"
                />
                <span className="mx-2 text-xl text-muted-foreground">→</span>
                <CustomSelect
                  items={dynamicSalesforceFields}
                  value={addRight2}
                  onValueChange={setAddRight2}
                  placeholder="..."
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2"
                  disabled={!addLeft2 || !addRight2}
                  onClick={addMapping2}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Stream events switch */}
            <div className="flex items-center gap-3 mb-4">
              <Switch checked={stream} onCheckedChange={setStream} />
              <span>
                Stream <span className="font-semibold text-primary">User events</span>
                <span className="mx-1">→</span>
                <span className="font-semibold text-blue-500">Contact activity</span>
              </span>
              <InfoIcon className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Info and actions */}
            {/* <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <InfoIcon className="w-4 h-4" />
          Changes will take effect and start syncing immediately after saving.
        </div> */}
            <DialogFooter>
              <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                Back
              </Button>
              <Button onClick={handleCreateMapping} disabled={isLoading}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                Save mapping
              </Button>
            </DialogFooter>
          </div>
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
