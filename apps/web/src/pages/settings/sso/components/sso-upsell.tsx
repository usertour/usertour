import { RiLockLine } from '@usertour/icons';
import { Button, SettingsPage } from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

/**
 * Locked state for SSO when the project's plan doesn't include it. SSO is paid:
 * cloud needs Business+, self-hosted needs an active license. The server
 * enforces the gate independently. Uses the app's standard locked-feature shape
 * (dashed panel, centered lock + copy + action) so it matches the rest of the
 * product; self-hosted shows no upgrade button (there is no billing page).
 */
export const SsoUpsell = ({
  isSelfHosted,
  projectId,
}: {
  isSelfHosted: boolean;
  projectId: string | undefined;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const variant = isSelfHosted ? 'selfHosted' : 'cloud';

  return (
    <SettingsPage title={t('settings.sso.title')} description={t('settings.sso.headerBody')}>
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <RiLockLine className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">
            {t(`settings.sso.locked.${variant}.title`)}
          </h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            {t(`settings.sso.locked.${variant}.description`)}
          </p>
          {!isSelfHosted && (
            <Button onClick={() => navigate(`/project/${projectId}/settings/billing`)}>
              {t('settings.sso.locked.cloud.upgrade')}
            </Button>
          )}
        </div>
      </div>
    </SettingsPage>
  );
};

SsoUpsell.displayName = 'SsoUpsell';
