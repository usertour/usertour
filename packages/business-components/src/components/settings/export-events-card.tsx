import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@usertour/ui';
import { Input } from '@usertour/ui';
import { Label } from '@usertour/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour/ui';
import { Skeleton } from '@usertour/ui';
import { Switch } from '@usertour/ui';
import { QuestionTooltip } from '@usertour/ui';
import type { IntegrationModel } from '@usertour/types';
import { LoadingButton } from '@usertour/ui';

interface RegionOption {
  value: string;
  label: ReactNode;
}

export interface ExportEventsCardProps {
  /** Local editable integration row from `useIntegrationConfig`. */
  integration: IntegrationModel | undefined;
  /** Server-truth row, used for dirty detection. */
  currentIntegration: IntegrationModel | undefined;
  /** Local field updates without persisting. */
  setLocal: (updates: Partial<IntegrationModel>) => void;
  /**
   * Persist current local state (optionally with a config patch). The
   * second argument overrides which integration snapshot to commit —
   * used internally by the switch-off auto-save to skip the local copy
   * (which includes unsaved key edits) and persist only the toggle.
   */
  save: (configPatch?: Record<string, unknown>, source?: IntegrationModel) => Promise<void>;
  isLoading?: boolean;
  /**
   * Tail of the "Stream events from Usertour to {providerName}" headline.
   * Pass `providerName` (e.g. "Mixpanel", "Heap") and the standard copy
   * is generated; pass `headline` for full control.
   */
  providerName: string;
  headline?: ReactNode;
  /** Tooltip text shown next to the toggle. Defaults to the standard copy. */
  tooltip?: ReactNode;
  /** Label for the API key input. Defaults to "API Key :". */
  keyLabel?: ReactNode;
  /** Placeholder for the API key input. Defaults to "Type API Key here". */
  keyPlaceholder?: string;
  /**
   * Optional region selector. Omit for providers without a region (heap,
   * hubspot, segment).
   */
  region?: {
    options: readonly RegionOption[];
    /** Default value selected when the integration has no region set yet. */
    defaultValue: string;
  };
  /**
   * Renders below the key (and region) but above the Save button. Used
   * by Mixpanel for the user-id property override.
   */
  extraFields?: ReactNode;
}

/**
 * Standard "Stream events from Usertour to X" form used by every
 * analytics integration page. Wraps the Switch + API key input + optional
 * region selector + Save into a single card, leaving provider-specific
 * field shapes (mixpanel cohort sync) for the caller to compose.
 */
export const ExportEventsCard = ({
  integration,
  currentIntegration,
  setLocal,
  save,
  isLoading,
  providerName,
  headline,
  tooltip,
  keyLabel,
  keyPlaceholder,
  region,
  extraFields,
}: ExportEventsCardProps) => {
  const { t } = useTranslation();
  const config = (integration?.config as { exportEvents?: boolean; region?: string }) ?? {};

  const hasChanges =
    !!integration &&
    (integration.key !== currentIntegration?.key ||
      integration.config?.exportEvents !== currentIntegration?.config?.exportEvents ||
      (region ? integration.config?.region !== currentIntegration?.config?.region : false));

  const handleSwitchChange = (checked: boolean) => {
    if (!integration) {
      return;
    }
    setLocal({ config: { ...integration.config, exportEvents: checked } });
    // Auto-save when the user disables — keeps "off" sticky without
    // requiring them to click Save afterwards. Pass `currentIntegration`
    // as the source so the toggle commit ignores any unsaved key edits
    // sitting in the local copy from the controlled Input.
    if (!checked) {
      save({ exportEvents: false }, currentIntegration);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex flex-row items-center gap-2">
          <Switch
            checked={config.exportEvents}
            onCheckedChange={handleSwitchChange}
            className="data-[state=unchecked]:bg-input"
            disabled={isLoading}
          />
          <Label className="text-sm">
            {headline ??
              t('settings.integrations.providerCard.headline', { provider: providerName })}
          </Label>
          <QuestionTooltip>
            {tooltip ?? t('settings.integrations.providerCard.tooltip', { provider: providerName })}
          </QuestionTooltip>
        </CardTitle>
        <CardDescription>
          {t('settings.integrations.providerCard.configureSettings')}
        </CardDescription>
      </CardHeader>
      {config.exportEvents ? (
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm">
              {keyLabel ?? t('settings.integrations.providerCard.apiKeyLabel')}
            </p>
            <Input
              type="text"
              placeholder={
                keyPlaceholder ?? t('settings.integrations.providerCard.apiKeyPlaceholder')
              }
              value={integration?.key ?? ''}
              onChange={(event) => integration && setLocal({ key: event.target.value })}
              disabled={isLoading}
            />
          </div>
          {region ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm">{t('settings.integrations.providerCard.regionLabel')}</p>
              <Select
                value={config.region ?? region.defaultValue}
                onValueChange={(value) =>
                  integration && setLocal({ config: { ...integration.config, region: value } })
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {region.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {extraFields}
          <LoadingButton
            disabled={!integration?.key || !hasChanges || isLoading}
            className="w-24"
            onClick={() => save()}
            loading={isLoading}
          >
            {t('settings.integrations.providerCard.save')}
          </LoadingButton>
        </CardContent>
      ) : null}
    </Card>
  );
};

ExportEventsCard.displayName = 'ExportEventsCard';

export const ExportEventsCardSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle className="space-between flex flex-row items-center gap-2">
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

ExportEventsCardSkeleton.displayName = 'ExportEventsCardSkeleton';
