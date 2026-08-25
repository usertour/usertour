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
 */
export const IntegrationStatusBadge = (props: IntegrationStatusBadgeProps) => {
  const { integration } = props;
  const { t } = useTranslation();

  if (!integration) {
    return <Badge variant="outline">{t('settings.integrations.status.notConnected')}</Badge>;
  }
  if (!integration.enabled) {
    return integration.autoDisabledAt ? (
      <Badge
        variant="destructive"
        className="whitespace-nowrap"
        title={t('settings.integrations.autoDisabled.tooltip', {
          time: format(new Date(integration.autoDisabledAt), 'PP'),
        })}
      >
        {t('settings.integrations.autoDisabled.badge')}
      </Badge>
    ) : (
      <Badge variant="secondary">{t('settings.integrations.status.disabled')}</Badge>
    );
  }
  if (integration.cooldownUntil && new Date(integration.cooldownUntil).getTime() > Date.now()) {
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
  return <Badge variant="success">{t('settings.integrations.status.enabled')}</Badge>;
};

IntegrationStatusBadge.displayName = 'IntegrationStatusBadge';
