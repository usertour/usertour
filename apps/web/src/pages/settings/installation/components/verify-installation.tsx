import { RiCheckboxCircleFill, SpinnerIcon } from '@usertour/icons';
import { useVerifyInstallationQuery } from '@usertour/hooks';
import { Button } from '@usertour/ui';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface VerifyInstallationProps {
  environmentId: string | undefined;
}

/**
 * Confirms usertour.js is wired up for the selected environment by polling the
 * backend for SDK data (a BizUser). Polls while waiting; stops once detected.
 */
export const VerifyInstallation = (props: VerifyInstallationProps) => {
  const { environmentId } = props;
  const { t } = useTranslation();
  const { installed, refetch, stopPolling } = useVerifyInstallationQuery(environmentId, {
    pollInterval: 5000,
  });

  // No need to keep polling once we've seen data — it won't revert.
  useEffect(() => {
    if (installed) {
      stopPolling();
    }
  }, [installed, stopPolling]);

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        {installed ? (
          <RiCheckboxCircleFill className="h-5 w-5 shrink-0 text-green-600" />
        ) : (
          <SpinnerIcon className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
        )}
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {installed
              ? t('settings.installation.verify.installedTitle')
              : t('settings.installation.verify.waitingTitle')}
          </p>
          <p className="text-xs text-muted-foreground">
            {installed
              ? t('settings.installation.verify.installedBody')
              : t('settings.installation.verify.waitingBody')}
          </p>
        </div>
      </div>
      {!installed && (
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => refetch()}>
          {t('settings.installation.verify.checkAgain')}
        </Button>
      )}
    </div>
  );
};

VerifyInstallation.displayName = 'VerifyInstallation';
