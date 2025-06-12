import { Button } from '@usertour-ui/button';
import { Input } from '@usertour-ui/input';
import { useState, useCallback, useEffect } from 'react';
import { useListIntegrationsQuery, useUpdateIntegrationMutation } from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';
import { useAppContext } from '@/contexts/app-context';
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from '@usertour-ui/select';
import { Switch } from '@usertour-ui/switch';
import { Label } from '@usertour-ui/label';
import { QuestionTooltip } from '@usertour-ui/tooltip';
import { Copy } from 'lucide-react';
import { useCopyToClipboard } from 'react-use';
import { integrations } from '@/utils/integration';
import { IntegrationModel } from '@usertour-ui/types';
import { Card, CardDescription } from '@usertour-ui/card';
import { CardHeader, CardTitle } from '@usertour-ui/card';
import { CardContent } from '@usertour-ui/card';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';

interface MixpanelIntegrationConfig {
  region?: string;
  exportEvents?: boolean;
  syncCohorts?: boolean;
  mixpanelUserIdProperty?: string;
  key?: string;
}

interface IntegrationFormProps {
  integration: IntegrationModel | undefined;
  currentIntegration: IntegrationModel | undefined;
  onSave: (updates: Partial<MixpanelIntegrationConfig>) => Promise<void>;
  onUpdate: (updates: Partial<IntegrationModel>) => void;
}

const INTEGRATION_CODE = 'mixpanel' as const;

const ExportEventsForm = ({
  integration,
  currentIntegration,
  onSave,
  onUpdate,
}: IntegrationFormProps) => {
  const config = (integration?.config as MixpanelIntegrationConfig) || {};

  const hasChanges = useCallback(() => {
    if (!integration) return false;
    return (
      integration.config?.exportEvents !== currentIntegration?.config?.exportEvents ||
      integration.key !== currentIntegration?.key ||
      integration.config?.region !== currentIntegration?.config?.region
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
          />
          <Label className="text-sm">Stream events from Usertour to Mixpanel</Label>
          <QuestionTooltip>
            When enabled, Usertour-generated events will be continuously streamed into your Mixpanel
            project.
          </QuestionTooltip>
        </CardTitle>
        <CardDescription>Configure event streaming settings</CardDescription>
      </CardHeader>
      {config.exportEvents && (
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm">Project Token :</p>
            <Input
              type="text"
              placeholder="Type Project Token here"
              value={integration?.key || ''}
              onChange={handleInputChange}
            />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm">Region:</p>
            <Select value={config.region || 'US'} onValueChange={handleRegionChange}>
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
            disabled={!integration?.key || !hasChanges()}
            className="w-24"
            onClick={() => onSave({})}
          >
            Save
          </Button>
        </CardContent>
      )}
    </Card>
  );
};

const SyncCohortsForm = ({
  integration,
  currentIntegration,
  onSave,
  onUpdate,
}: IntegrationFormProps) => {
  const { globalConfig } = useAppContext();
  const { toast } = useToast();
  const [_, copyToClipboard] = useCopyToClipboard();
  const config = (integration?.config as MixpanelIntegrationConfig) || {};

  const webhookUrl = `${globalConfig?.apiUrl}/api/mixpanel_webhook/${integration?.accessToken}`;

  const handleCopy = useCallback(() => {
    copyToClipboard(webhookUrl);
    toast({
      title: 'Webhook URL copied to clipboard',
    });
  }, [webhookUrl, copyToClipboard, toast]);

  const hasChanges = useCallback(() => {
    if (!integration) return false;
    return (
      integration.config?.syncCohorts !== currentIntegration?.config?.syncCohorts ||
      integration.config?.mixpanelUserIdProperty !==
        currentIntegration?.config?.mixpanelUserIdProperty
    );
  }, [integration, currentIntegration]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!integration) return;
      onUpdate({
        config: { ...integration.config, mixpanelUserIdProperty: e.target.value },
      });
    },
    [integration, onUpdate],
  );

  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      if (!integration) return;
      // Update local state
      onUpdate({
        config: { ...integration.config, syncCohorts: checked },
      });
      // Auto save when switch is turned off
      if (!checked) {
        onSave({ syncCohorts: false });
      }
    },
    [integration, onUpdate, onSave],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex items-center gap-2 flex-row items-center">
          <Switch
            checked={config.syncCohorts}
            onCheckedChange={handleSwitchChange}
            className="data-[state=unchecked]:bg-input"
          />
          <Label className="text-sm">Cohort sync from Mixpanel</Label>
        </CardTitle>
        <CardDescription>Configure cohort synchronization settings</CardDescription>
      </CardHeader>
      {config.syncCohorts && (
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="link">Webhook URL</Label>
            <div className="relative flex-1">
              <Input id="link" defaultValue={webhookUrl} readOnly className="h-9 pr-10" />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="absolute top-0.5 right-0.5 size-7"
                onClick={handleCopy}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm">Mixpanel User ID Property (for cohort sync) :</p>
            <Input
              type="text"
              placeholder="Type Mixpanel User ID Property here"
              value={config.mixpanelUserIdProperty || ''}
              onChange={handleInputChange}
            />
          </div>
          <Button
            disabled={!config.mixpanelUserIdProperty || !hasChanges()}
            className="w-24"
            onClick={() => onSave({})}
          >
            Save
          </Button>
        </CardContent>
      )}
    </Card>
  );
};

export const MixpanelIntegration = () => {
  const { environment } = useAppContext();
  const { toast } = useToast();

  const environmentId = environment?.id || '';
  const { data: integrationsData, refetch } = useListIntegrationsQuery(environmentId);

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
    async (updates: Partial<MixpanelIntegrationConfig>) => {
      try {
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
                  <span>Read the Mixpanel guide</span>
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
      />

      <SyncCohortsForm
        integration={integration}
        currentIntegration={currentIntegration}
        onSave={handleSave}
        onUpdate={handleUpdate}
      />
    </>
  );
};

MixpanelIntegration.displayName = 'MixpanelIntegration';
