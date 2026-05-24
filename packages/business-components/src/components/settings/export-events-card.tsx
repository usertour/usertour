import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@usertour/card';
import { Input } from '@usertour/input';
import { Label } from '@usertour/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour/select';
import { Skeleton } from '@usertour/skeleton';
import { Switch } from '@usertour/switch';
import { QuestionTooltip } from '@usertour/tooltip';
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
  /** Persist current local state (optionally with a config patch). */
  save: (configPatch?: Record<string, unknown>) => Promise<void>;
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
    // requiring them to click Save afterwards.
    if (!checked) {
      save({ exportEvents: false });
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
            {headline ?? `Stream events from Usertour to ${providerName}`}
          </Label>
          <QuestionTooltip>
            {tooltip ??
              `When enabled, Usertour-generated events will be continuously streamed into your ${providerName} project.`}
          </QuestionTooltip>
        </CardTitle>
        <CardDescription>Configure event streaming settings</CardDescription>
      </CardHeader>
      {config.exportEvents ? (
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm">{keyLabel ?? 'API Key :'}</p>
            <Input
              type="text"
              placeholder={keyPlaceholder ?? 'Type API Key here'}
              value={integration?.key ?? ''}
              onChange={(event) => integration && setLocal({ key: event.target.value })}
              disabled={isLoading}
            />
          </div>
          {region ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm">Region:</p>
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
            Save
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
