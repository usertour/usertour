import { RiLockLine } from '@usertour/icons';
import { Button, SettingsPage } from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export interface IntegrationUpsellProps {
  projectId: string | undefined;
  environmentName: string;
}

/**
 * Locked state for integrations when the project's plan doesn't include them.
 * Cloud-only in practice: self-hosted never gates integrations
 * (getProjectConfig forces the flag on), so this only renders for cloud
 * projects below Starter. Same shape as the webhook locked state; the server
 * enforces the gate independently on every write and on delivery.
 */
export const IntegrationUpsell = (props: IntegrationUpsellProps) => {
  const { projectId, environmentName } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <SettingsPage
      title={t('settings.integrations.title', { environment: environmentName })}
      description={t('settings.integrations.headerBody')}
      docs={{
        href: 'https://docs.usertour.io/how-to-guides/integrations',
        label: t('settings.common.readGuide', { topic: t('settings.nav.sections.integrations') }),
      }}
    >
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <RiLockLine className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">{t('settings.integrations.locked.title')}</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            {t('settings.integrations.locked.description')}
          </p>
          <Button onClick={() => navigate(`/project/${projectId}/settings/billing`)}>
            {t('settings.integrations.locked.upgrade')}
          </Button>
        </div>
      </div>
    </SettingsPage>
  );
};

IntegrationUpsell.displayName = 'IntegrationUpsell';
