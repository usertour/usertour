import { RiLockLine } from '@usertour/icons';
import { Button, SettingsPage } from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export interface WebhookUpsellProps {
  projectId: string | undefined;
  environmentName: string;
}

/**
 * Locked state for webhooks when the project's plan doesn't include them.
 * Cloud-only in practice: self-hosted never gates webhooks (getProjectConfig
 * forces the flag on there), so this only renders for cloud projects below
 * Starter. Same shape as the audit-log locked state (SettingsPage header +
 * dashed placeholder panel); the server enforces the gate independently on
 * every write and on delivery.
 */
export const WebhookUpsell = (props: WebhookUpsellProps) => {
  const { projectId, environmentName } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <SettingsPage
      title={t('settings.webhooks.title', { environment: environmentName })}
      description={t('settings.webhooks.headerBody')}
    >
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <RiLockLine className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">{t('settings.webhooks.locked.title')}</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            {t('settings.webhooks.locked.description')}
          </p>
          <Button onClick={() => navigate(`/project/${projectId}/settings/billing`)}>
            {t('settings.webhooks.locked.upgrade')}
          </Button>
        </div>
      </div>
    </SettingsPage>
  );
};

WebhookUpsell.displayName = 'WebhookUpsell';
