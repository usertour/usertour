import { RiLockLine } from '@usertour/icons';
import { Button, SettingsPage } from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

/**
 * Locked state for the audit log when the project's plan doesn't include the
 * feature. Audit log is paid: cloud needs Business+, self-hosted needs an active
 * license. Capture still runs server-side; this only replaces the read view, and
 * the server enforces the gate independently (the read query throws).
 *
 * Uses the app's standard empty/placeholder shape (dashed-border panel, centered
 * icon + copy + action) so it reads as a deliberate locked state, consistent with
 * the rest of the product.
 */
export const AuditLogUpsell = ({
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
    <SettingsPage
      title={t('settings.auditLog.title')}
      description={t('settings.auditLog.description')}
    >
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <RiLockLine className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">
            {t(`settings.auditLog.locked.${variant}.title`)}
          </h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            {t(`settings.auditLog.locked.${variant}.description`)}
          </p>
          {!isSelfHosted && (
            <Button onClick={() => navigate(`/project/${projectId}/settings/billing`)}>
              {t('settings.auditLog.locked.cloud.upgrade')}
            </Button>
          )}
        </div>
      </div>
    </SettingsPage>
  );
};

AuditLogUpsell.displayName = 'AuditLogUpsell';
