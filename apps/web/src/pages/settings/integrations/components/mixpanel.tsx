import { useCallback } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Copy } from 'lucide-react';
import {
  ExportEventsCard,
  ExportEventsCardSkeleton,
  IntegrationProviderHeader,
  IntegrationProviderHeaderSkeleton,
} from '@usertour/business-components';
import { Button } from '@usertour/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@usertour/card';
import { SpinnerIcon } from '@usertour/icons';
import { Input } from '@usertour/input';
import { Label } from '@usertour/label';
import { Skeleton } from '@usertour/skeleton';
import { Switch } from '@usertour/switch';
import { useToast } from '@usertour/use-toast';
import { useAppContext } from '@/contexts/app-context';
import { integrations } from '@/utils/integration';
import { useIntegrationConfig } from '../hooks/use-integration-config';

interface MixpanelIntegrationConfig {
  region?: string;
  exportEvents?: boolean;
  syncCohorts?: boolean;
  mixpanelUserIdProperty?: string;
  key?: string;
}

const INTEGRATION_PROVIDER = 'mixpanel' as const;
const DOCS_HREF = 'https://docs.usertour.io/how-to-guides/environments/';

/**
 * Mixpanel-only "Cohort sync" card — exposes a generated webhook URL and
 * the optional Mixpanel user-id property the webhook expects. Stays
 * provider-local because no other integration uses this shape.
 */
interface SyncCohortsCardProps {
  config: ReturnType<typeof useIntegrationConfig<MixpanelIntegrationConfig>>;
}

const SyncCohortsCard = ({ config }: SyncCohortsCardProps) => {
  const { integration, currentIntegration, setLocal, save, isLoading } = config;
  const { globalConfig } = useAppContext();
  const { toast } = useToast();
  const [_, copyToClipboard] = useCopyToClipboard();
  const integrationConfig = (integration?.config as MixpanelIntegrationConfig) ?? {};

  const webhookUrl = `${globalConfig?.apiUrl}/api/mixpanel_webhook/${integration?.accessToken}`;

  const handleCopy = useCallback(() => {
    copyToClipboard(webhookUrl);
    toast({ title: 'Webhook URL copied to clipboard' });
  }, [webhookUrl, copyToClipboard, toast]);

  const hasChanges =
    !!integration &&
    (integration.config?.syncCohorts !== currentIntegration?.config?.syncCohorts ||
      integration.config?.mixpanelUserIdProperty !==
        currentIntegration?.config?.mixpanelUserIdProperty);

  const handleSwitchChange = (checked: boolean) => {
    if (!integration) {
      return;
    }
    setLocal({ config: { ...integration.config, syncCohorts: checked } });
    // Same auto-save behaviour as the export-events toggle.
    if (!checked) {
      save({ syncCohorts: false });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex flex-row items-center gap-2">
          <Switch
            checked={integrationConfig.syncCohorts}
            onCheckedChange={handleSwitchChange}
            className="data-[state=unchecked]:bg-input"
            disabled={isLoading}
          />
          <Label className="text-sm">Cohort sync from Mixpanel</Label>
        </CardTitle>
        <CardDescription>Configure cohort synchronization settings</CardDescription>
      </CardHeader>
      {integrationConfig.syncCohorts ? (
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
                disabled={isLoading}
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
              value={integrationConfig.mixpanelUserIdProperty ?? ''}
              onChange={(event) =>
                integration &&
                setLocal({
                  config: { ...integration.config, mixpanelUserIdProperty: event.target.value },
                })
              }
              disabled={isLoading}
            />
          </div>
          <Button
            disabled={!integrationConfig.mixpanelUserIdProperty || !hasChanges || isLoading}
            className="w-24"
            onClick={() => save()}
          >
            {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
};

const SyncCohortsCardSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle className="space-between flex flex-row items-center gap-2">
        <Skeleton className="h-6 w-10" />
        <Skeleton className="h-6 w-48" />
      </CardTitle>
      <div className="text-sm text-muted-foreground">
        <Skeleton className="h-4 w-56" />
      </div>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="text-sm">
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-sm">
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-24" />
    </CardContent>
  </Card>
);

export const MixpanelIntegration = () => {
  const config = useIntegrationConfig<MixpanelIntegrationConfig>(INTEGRATION_PROVIDER);
  const info = integrations.find((entry) => entry.provider === INTEGRATION_PROVIDER);

  if (config.isDataLoading) {
    return (
      <>
        <IntegrationProviderHeaderSkeleton />
        <ExportEventsCardSkeleton />
        <SyncCohortsCardSkeleton />
      </>
    );
  }

  return (
    <>
      <IntegrationProviderHeader
        imagePath={info?.imagePath ?? ''}
        name={info?.name ?? 'Mixpanel'}
        description={info?.description}
        docs={{ href: DOCS_HREF, label: 'Read the Mixpanel guide' }}
      />
      <ExportEventsCard
        providerName="Mixpanel"
        keyLabel="Project Token :"
        keyPlaceholder="Type Project Token here"
        integration={config.integration}
        currentIntegration={config.currentIntegration}
        setLocal={config.setLocal}
        save={config.save}
        isLoading={config.isLoading}
        region={{
          defaultValue: 'US',
          options: [
            { value: 'US', label: 'Default(US)' },
            { value: 'EU', label: 'EU' },
          ],
        }}
      />
      <SyncCohortsCard config={config} />
    </>
  );
};

MixpanelIntegration.displayName = 'MixpanelIntegration';
