import { Button } from '@usertour-packages/button';
import { Input } from '@usertour-packages/input';
import { useState, useCallback, useEffect } from 'react';
import {
  useListIntegrationsQuery,
  useUpdateIntegrationMutation,
} from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { useAppContext } from '@/contexts/app-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from '@usertour-packages/select';
import { Switch } from '@usertour-packages/switch';
import { Label } from '@usertour-packages/label';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { integrations } from '@/utils/integration';
import { IntegrationModel } from '@usertour/types';
import { Card, CardDescription } from '@usertour-packages/card';
import { CardHeader, CardTitle } from '@usertour-packages/card';
import { CardContent } from '@usertour-packages/card';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Skeleton } from '@usertour-packages/skeleton';
import { SpinnerIcon } from '@usertour-packages/icons';

interface SegmentIntegrationConfig {
  region?: string;
  exportEvents?: boolean;
}

interface IntegrationFormProps {
  integration: IntegrationModel | undefined;
  currentIntegration: IntegrationModel | undefined;
  onSave: (updates: Partial<SegmentIntegrationConfig>) => Promise<void>;
  onUpdate: (updates: Partial<IntegrationModel>) => void;
  isLoading?: boolean;
}

const INTEGRATION_PROVIDER = 'segment' as const;

const ExportEventsForm = ({
  integration,
  currentIntegration,
  onSave,
  onUpdate,
  isLoading,
}: IntegrationFormProps) => {
  const config = (integration?.config as SegmentIntegrationConfig) || {};

  const hasChanges = useCallback(() => {
    if (!integration) return false;
    return (
      integration.key !== currentIntegration?.key ||
      integration.config?.region !== currentIntegration?.config?.region ||
      integration.config?.exportEvents !== currentIntegration?.config?.exportEvents
    );
  }, [integration, currentIntegration]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!integration) return;
      onUpdate({
        key: e.target.value,
      });
    },
    [integration, onUpdate],
  );

  const handleRegionChange = useCallback(
    (value: string) => {
      if (!integration) return;
      onUpdate({
        config: { ...integration.config, region: value },
      });
    },
    [integration, onUpdate],
  );

  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      if (!integration) return;
      // Update local state
      onUpdate({
        config: { ...integration.config, exportEvents: checked },
      });
      // Auto save when switch is turned off
      if (!checked) {
        onSave({ exportEvents: false });
      }
    },
    [integration, onUpdate, onSave],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex items-center gap-2 flex-row items-center">
          <Switch
            checked={config.exportEvents}
            onCheckedChange={handleSwitchChange}
            className="data-[state=unchecked]:bg-input"
            disabled={isLoading}
          />
          <Label className="text-sm">Stream events from Usertour to Segment</Label>
          <QuestionTooltip>
            When enabled, Usertour-generated events will be continuously streamed into your Segment
            project.
          </QuestionTooltip>
        </CardTitle>
        <CardDescription>Configure event streaming settings</CardDescription>
      </CardHeader>
      {config.exportEvents && (
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-sm">Segment Write Key :</div>
            <Input
              type="text"
              placeholder="Type Write Key here"
              value={integration?.key || ''}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-sm">Region:</div>
            <Select
              value={config.region || 'US'}
              onValueChange={handleRegionChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Default(US)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">Default(US)</SelectItem>
                <SelectItem value="EU">EU</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={!integration?.key || !hasChanges() || isLoading}
            className="w-24"
            onClick={() => onSave({})}
          >
            {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </CardContent>
      )}
    </Card>
  );
};

const ExportEventsFormSkeleton = () => (
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
      <div className="flex flex-col gap-1">
        <div className="text-sm">
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-24" />
    </CardContent>
  </Card>
);

export const SegmentIntegration = () => {
  const { environment } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const environmentId = environment?.id || '';
  const {
    data: integrationsData,
    refetch,
    loading: isDataLoading,
  } = useListIntegrationsQuery(environmentId);

  const currentIntegration = integrationsData?.find(
    (i: IntegrationModel) => i.provider === INTEGRATION_PROVIDER,
  );
  const [integration, setIntegration] = useState(currentIntegration);

  useEffect(() => {
    setIntegration(currentIntegration);
  }, [currentIntegration]);

  const { invoke: updateIntegration } = useUpdateIntegrationMutation();
  const integrationInfo = integrations.find((i) => i.provider === INTEGRATION_PROVIDER);

  const handleSave = useCallback(
    async (updates: Partial<SegmentIntegrationConfig>) => {
      try {
        setIsLoading(true);
        await updateIntegration(environmentId, INTEGRATION_PROVIDER, {
          enabled: true,
          key: integration?.key,
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
        <ExportEventsFormSkeleton />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex items-center gap-4 flex-row items-center">
            <img
              src={integrationInfo?.imagePath}
              alt={`${integrationInfo?.name} logo`}
              className="w-12 h-12"
            />
            <div className="flex flex-col gap-1">
              <div className="text-lg font-semibold">{integrationInfo?.name}</div>
              <div className="text-sm text-muted-foreground font-normal">
                {integrationInfo?.description}{' '}
                <a
                  href="https://docs.usertour.io/how-to-guides/environments/"
                  className="text-primary"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Read the Segment guide</span>
                  <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
                </a>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <ExportEventsForm
        integration={integration}
        currentIntegration={currentIntegration}
        onSave={handleSave}
        onUpdate={handleUpdate}
        isLoading={isLoading}
      />
    </>
  );
};

SegmentIntegration.displayName = 'SegmentIntegration';
