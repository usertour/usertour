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

interface MixpanelIntegrationConfig {
  region?: string;
  exportEvents?: boolean;
  syncCohorts?: boolean;
  mixpanelUserIdProperty?: string;
}

export const MixpanelIntegration = () => {
  const { toast } = useToast();
  const { environment } = useAppContext();

  const environmentId = environment?.id || '';
  const { data: integrationsData, refetch } = useListIntegrationsQuery(environmentId);

  const currentIntegration = integrationsData?.find((i: IntegrationModel) => i.code === 'mixpanel');
  const [integration, setIntegration] = useState(currentIntegration);

  useEffect(() => {
    setIntegration(currentIntegration);
  }, [currentIntegration]);

  const { invoke: updateIntegration } = useUpdateIntegrationMutation();
  const { globalConfig } = useAppContext();

  const webhookUrl = `${globalConfig?.apiUrl}/api/mixpanel_webhook/${integration?.accessToken}`;
  const [_, copyToClipboard] = useCopyToClipboard();
  const integrationInfo = integrations.find((i) => i.code === 'mixpanel');

  const handleCopy = useCallback(() => {
    copyToClipboard(webhookUrl);
    toast({
      title: 'Webhook URL copied to clipboard',
    });
  }, [webhookUrl, copyToClipboard, toast]);

  const handleSave = useCallback(
    async (updates: Partial<MixpanelIntegrationConfig>) => {
      try {
        await updateIntegration(environmentId, 'mixpanel', {
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

  const hasExportEventsChanges = useCallback(() => {
    if (!integration) return false;
    return (
      integration.key !== currentIntegration?.key ||
      integration.config?.region !== currentIntegration?.config?.region
    );
  }, [integration, currentIntegration]);

  const hasSyncCohortsChanges = useCallback(() => {
    if (!integration) return false;
    return (
      integration.config?.mixpanelUserIdProperty !==
      currentIntegration?.config?.mixpanelUserIdProperty
    );
  }, [integration, currentIntegration]);

  const config = (integration?.config as MixpanelIntegrationConfig) || {};

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex items-center gap-2 flex-row items-center">
            <Switch
              checked={config.exportEvents}
              onCheckedChange={(checked) => {
                setIntegration((prev: IntegrationModel | undefined) => ({
                  ...prev,
                  config: { ...prev?.config, exportEvents: checked },
                }));
                if (!checked) {
                  handleSave({ exportEvents: false });
                }
              }}
              className="data-[state=unchecked]:bg-input"
            />
            <Label className="text-sm">Stream events from Usertour to Mixpanel</Label>
            <QuestionTooltip>
              When enabled, Usertour-generated events will be continuously streamed into your
              Mixpanel project.
            </QuestionTooltip>
          </CardTitle>
          <CardDescription>{integrationInfo?.description}</CardDescription>
        </CardHeader>
        {config.exportEvents && (
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm">Project Token :</p>
            <Input
              type="text"
              placeholder="Type Project Token here"
              value={integration?.key || ''}
              onChange={(e) => {
                setIntegration((prev: IntegrationModel | undefined) => ({
                  ...prev,
                  key: e.target.value,
                }));
              }}
            />
            <p className="text-sm">Region:</p>
            <Select
              value={config.region || 'US'}
              onValueChange={(value) => {
                setIntegration((prev: IntegrationModel | undefined) => ({
                  ...prev,
                  config: { ...prev?.config, region: value },
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Default(US)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">Default(US)</SelectItem>
                <SelectItem value="EU">EU</SelectItem>
              </SelectContent>
            </Select>
            <Button
              disabled={!integration?.key || !hasExportEventsChanges()}
              className="w-24 mt-4"
              onClick={() => handleSave({})}
            >
              Save
            </Button>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="space-between flex items-center gap-2 flex-row items-center">
            <Switch
              checked={config.syncCohorts}
              onCheckedChange={(checked) => {
                setIntegration((prev: IntegrationModel | undefined) => ({
                  ...prev,
                  config: { ...prev?.config, syncCohorts: checked },
                }));
                if (!checked) {
                  handleSave({ syncCohorts: false });
                }
              }}
              className="data-[state=unchecked]:bg-input"
            />
            <Label className="text-sm">Cohort sync from Mixpanel</Label>
          </CardTitle>
          <CardDescription>{integrationInfo?.description}</CardDescription>
        </CardHeader>
        {config.syncCohorts && (
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm">Mixpanel User ID Property (for cohort sync) :</p>
            <Input
              type="text"
              placeholder="Type Mixpanel User ID Property here"
              value={config.mixpanelUserIdProperty || ''}
              onChange={(e) => {
                setIntegration((prev: IntegrationModel | undefined) => ({
                  ...prev,
                  config: { ...prev?.config, mixpanelUserIdProperty: e.target.value },
                }));
              }}
            />
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
            <Button
              disabled={!config.mixpanelUserIdProperty || !hasSyncCohortsChanges()}
              className="w-24 mt-4"
              onClick={() => handleSave({})}
            >
              Save
            </Button>
          </CardContent>
        )}
      </Card>
    </>
  );
};

MixpanelIntegration.displayName = 'MixpanelIntegration';
