import { Button } from '@usertour-ui/button';
import { Input } from '@usertour-ui/input';
import { useState } from 'react';
import { useListIntegrationsQuery } from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';
import { useAppContext } from '@/contexts/app-context';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from '@usertour-ui/select';
import { Switch } from '@usertour-ui/switch';
import { Label } from '@usertour-ui/label';
import { QuestionTooltip } from '@usertour-ui/tooltip';
import { Copy } from 'lucide-react';
import { useCopyToClipboard } from 'react-use';
import { integrations } from '@/utils/integration';
import { IntegrationModel } from '@usertour-ui/types';

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
  const { data: integrationsData } = useListIntegrationsQuery(environmentId);

  const currentIntegration = integrationsData?.find((i: IntegrationModel) => i.code === 'mixpanel');
  const [apiKey, setApiKey] = useState(currentIntegration?.key || '');
  const [region, setRegion] = useState(
    (currentIntegration?.config as MixpanelIntegrationConfig)?.region || 'US',
  );
  const [exportEvents, setExportEvents] = useState(
    (currentIntegration?.config as MixpanelIntegrationConfig)?.exportEvents ?? false,
  );
  const [syncCohorts, setSyncCohorts] = useState(
    (currentIntegration?.config as MixpanelIntegrationConfig)?.syncCohorts ?? false,
  );
  const [mixpanelUserIdProperty, setMixpanelUserIdProperty] = useState(
    (currentIntegration?.config as MixpanelIntegrationConfig)?.mixpanelUserIdProperty || '',
  );
  const { globalConfig } = useAppContext();

  const webhookUrl = `${globalConfig?.apiUrl}/api/mixpanel_webhook/${currentIntegration?.accessToken}`;
  const [_, copyToClipboard] = useCopyToClipboard();
  const integration = integrations.find((i) => i.code === 'mixpanel');

  const handleCopy = () => {
    copyToClipboard(webhookUrl);
    toast({
      title: 'Webhook URL copied to clipboard',
    });
  };

  return (
    <>
      <div className="flex items-center justify-center gap-x-4">
        <div className="h-12 w-12 rounded-lg border border-accent-light p-1.5">
          <img src="/images/logo.png" className="w-full h-full" />
        </div>
        <DotsHorizontalIcon className="w-6 h-6" />
        <div className="h-12 w-12 rounded-lg border border-accent-light p-1.5">
          <img src={integration?.imagePath} alt={`${integration?.name} logo`} className="w-8 h-8" />
        </div>
      </div>
      <div className="mt-4 text-center text-lg/6 font-semibold">Connect {integration?.name}</div>
      {integration?.description}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={exportEvents}
            onCheckedChange={setExportEvents}
            className="data-[state=unchecked]:bg-input"
          />
          <Label className="text-sm">Stream events from Usertour to Mixpanel</Label>
          <QuestionTooltip>
            When enabled, Usertour-generated events will be continuously streamed into your Mixpanel
            project.
          </QuestionTooltip>
        </div>

        {exportEvents && (
          <>
            <div className="flex flex-col gap-1">
              <p className="text-sm">Project Token :</p>
              <Input
                type="text"
                placeholder="Type Project Token here"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm">Region:</p>
              <Select value={region || 'US'} onValueChange={(value) => setRegion(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Default(US)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">Default(US)</SelectItem>
                  <SelectItem value="EU">EU</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          <Switch
            checked={syncCohorts}
            onCheckedChange={setSyncCohorts}
            className="data-[state=unchecked]:bg-input"
          />
          <Label className="text-sm">Cohort sync from Mixpanel</Label>
        </div>

        {syncCohorts && (
          <>
            <div className="flex flex-col gap-1">
              <p className="text-sm">Mixpanel User ID Property (for cohort sync) :</p>
              <Input
                type="text"
                placeholder="Type Mixpanel User ID Property here"
                value={mixpanelUserIdProperty}
                onChange={(e) => setMixpanelUserIdProperty(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 ">
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
          </>
        )}
      </div>
      <Button disabled={(exportEvents && !apiKey) || (syncCohorts && !mixpanelUserIdProperty)}>
        Save
      </Button>
    </>
  );
};

MixpanelIntegration.displayName = 'MixpanelIntegration';
