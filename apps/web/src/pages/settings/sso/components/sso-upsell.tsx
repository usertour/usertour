import { RiLockLine } from '@usertour/icons';
import { Button, Separator, SettingsCard, SettingsCardStack } from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

/**
 * Locked state for SSO when the project's plan doesn't include it. SSO is paid:
 * cloud needs Business+, self-hosted needs an active license. The server
 * enforces the gate independently. Rendered inside the same settings card stack
 * + title block as the configured SSO page, so the locked and unlocked states
 * read as the same page (not a bare dashed panel). Self-hosted shows no upgrade
 * button (there is no billing page).
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
    <SettingsCardStack>
      <SettingsCard>
        <div className="space-y-6">
          {/* Same title block as the configured page so switching locked ⇄
              unlocked doesn't shift the heading. */}
          <div className="space-y-2">
            <div className="flex h-10 flex-row items-center">
              <h3 className="text-xl font-medium tracking-tight">{t('settings.sso.title')}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{t('settings.sso.headerBody')}</p>
          </div>
          <Separator />
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <RiLockLine className="h-6 w-6 text-primary" />
            </div>
            <h4 className="mt-4 text-lg font-semibold">
              {t(`settings.sso.locked.${variant}.title`)}
            </h4>
            <p className="mb-4 mt-2 max-w-[420px] text-sm text-muted-foreground">
              {t(`settings.sso.locked.${variant}.description`)}
            </p>
            {!isSelfHosted && (
              <Button onClick={() => navigate(`/project/${projectId}/settings/billing`)}>
                {t('settings.sso.locked.cloud.upgrade')}
              </Button>
            )}
          </div>
        </div>
      </SettingsCard>
    </SettingsCardStack>
  );
};

SsoUpsell.displayName = 'SsoUpsell';
