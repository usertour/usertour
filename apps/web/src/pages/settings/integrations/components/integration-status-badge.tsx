import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { Integration } from '@usertour/hooks';
import { Badge } from '@usertour/ui';

export interface IntegrationStatusBadgeProps {
  /** Absent row = the provider has never been configured. */
  integration: Integration | undefined;
}

/**
 * One status vocabulary for the list cards and the detail header:
 * not connected / disabled / auto-disabled / cooling down / enabled — the
 * same ladder the webhook list renders, minus its table framing.
 *
 * Outbound faults (auto-disabled, cooling down) outrank everything — they
 * are the actionable signals. Below that, enabled/disabled is INTEGRATION
 * level: either capability running (event streaming or inbound cohort sync)
 * counts as enabled — a cohort-sync-only setup is working, not "Disabled".
 */
export const IntegrationStatusBadge = (props: IntegrationStatusBadgeProps) => {
  const { integration } = props;
  const { t } = useTranslation();

  if (!integration) {
    return <Badge variant="outline">{t('settings.integrations.status.notConnected')}</Badge>;
  }
  if (integration.autoDisabledAt && !integration.enabled) {
    return (
      <Badge
        variant="destructive"
        className="whitespace-nowrap"
        title={t('settings.integrations.autoDisabled.tooltip', {
          time: format(new Date(integration.autoDisabledAt), 'PP'),
        })}
      >
        {t('settings.integrations.autoDisabled.badge')}
      </Badge>
    );
  }
  if (
    integration.enabled &&
    integration.cooldownUntil &&
    new Date(integration.cooldownUntil).getTime() > Date.now()
  ) {
    return (
      <Badge
        variant="warning"
        className="whitespace-nowrap"
        title={t('settings.integrations.cooldown.tooltip', {
          count: integration.consecutiveFailures,
          time: format(new Date(integration.cooldownUntil), 'pp'),
        })}
      >
        {t('settings.integrations.cooldown.badge')}
      </Badge>
    );
  }
  if (integration.enabled || integration.inboundEnabled) {
    return <Badge variant="success">{t('settings.integrations.status.enabled')}</Badge>;
  }
  return <Badge variant="secondary">{t('settings.integrations.status.disabled')}</Badge>;
};

IntegrationStatusBadge.displayName = 'IntegrationStatusBadge';
