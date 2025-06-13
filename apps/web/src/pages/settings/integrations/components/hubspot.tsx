import { Button } from '@usertour-ui/button';
import { Input } from '@usertour-ui/input';
import { useState, useCallback, useEffect } from 'react';
import { useListIntegrationsQuery, useUpdateIntegrationMutation } from '@usertour-ui/shared-hooks';
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
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Skeleton } from '@usertour-ui/skeleton';
import { SpinnerIcon } from '@usertour-ui/icons';

interface HubSpotIntegrationConfig {
  exportEvents?: boolean;
}

interface IntegrationFormProps {
  integration: IntegrationModel | undefined;
  currentIntegration: IntegrationModel | undefined;
  onSave: (updates: Partial<HubSpotIntegrationConfig>) => Promise<void>;
  onUpdate: (updates: Partial<IntegrationModel>) => void;
  isLoading?: boolean;
}

const INTEGRATION_CODE = 'hubspot' as const;

const ExportEventsForm = ({
  integration,
  currentIntegration,
  onSave,
  onUpdate,
  isLoading,
}: IntegrationFormProps) => {
  const config = (integration?.config as HubSpotIntegrationConfig) || {};

  const hasChanges = useCallback(() => {
    if (!integration) return false;
    return (
      integration.key !== currentIntegration?.key ||
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
          <Label className="text-sm">Stream events from Usertour to HubSpot</Label>
          <QuestionTooltip>
            When enabled, Usertour-generated events will be continuously streamed into your HubSpot
            project.
          </QuestionTooltip>
        </CardTitle>
        <CardDescription>Configure event streaming settings</CardDescription>
      </CardHeader>
      {config.exportEvents && (
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm">Private App Token :</p>
            <Input
              type="text"
              placeholder="Type Private App Token here"
              value={integration?.key || ''}
              onChange={handleInputChange}
              disabled={isLoading}
            />
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

export const HubSpotIntegration = () => {
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
    (i: IntegrationModel) => i.code === INTEGRATION_CODE,
  );
  const [integration, setIntegration] = useState(currentIntegration);

  useEffect(() => {
    setIntegration(currentIntegration);
  }, [currentIntegration]);

  const { invoke: updateIntegration } = useUpdateIntegrationMutation();
  const integrationInfo = integrations.find((i) => i.code === INTEGRATION_CODE);

  const handleSave = useCallback(
    async (updates: Partial<HubSpotIntegrationConfig>) => {
      try {
        setIsLoading(true);
        await updateIntegration(environmentId, INTEGRATION_CODE, {
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
                  <span>Read the HubSpot guide</span>
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

HubSpotIntegration.displayName = 'HubSpotIntegration';
