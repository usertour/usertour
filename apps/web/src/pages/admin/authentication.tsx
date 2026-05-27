import {
  useAdminInstanceSettingsQuery,
  useAdminSettingsQuery,
  useInvalidateLicenseScopedCache,
  useUpdateInstanceAuthenticationSettingsMutation,
  useUpdateInstanceRequire2FAMutation,
} from '@usertour/hooks';
import {
  useToast,
  Separator,
  Button,
  Skeleton,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { SettingsContent } from '@/pages/settings/components/content';
import { RiAlertLine, RiSparklingFill } from '@usertour/icons';
import { getErrorMessage } from '@usertour/helpers';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { LICENSE_FEATURE_TWO_FACTOR } from '@usertour/constants';

export const AdminAuthenticationPage = () => {
  const { t } = useTranslation('ui');
  const { userInfo, project } = useAppContext();
  const { data, loading, refetch } = useAdminInstanceSettingsQuery();
  const { data: adminSettings, loading: adminSettingsLoading } = useAdminSettingsQuery();
  // Wait for both admin queries to resolve before rendering license-derived
  // UI. Otherwise undefined data falls through `?.` chains to `false`, the
  // page paints as if the license were missing, then re-paints once the
  // queries return — the visible flash of the sparkle and amber warnings.
  const isLicenseInfoReady = !loading && !adminSettingsLoading && !!adminSettings;
  const { invoke: updateAuthenticationSettings, loading: updating } =
    useUpdateInstanceAuthenticationSettingsMutation();
  const { invoke: updateRequire2FA, loading: updatingRequire2FA } =
    useUpdateInstanceRequire2FAMutation();
  const invalidateLicenseScopedCache = useInvalidateLicenseScopedCache();
  const { toast } = useToast();
  const [allowUserRegistration, setAllowUserRegistration] = useState(true);
  const require2FA = !!data?.require2FA;
  const adminHasOwn2FA = !!userInfo?.twoFactorEnabled;
  // `isValid` is the server's own combined check (signature + scope/instanceId
  // + expiration) — keep this aligned with LicenseService.hasFeature, which
  // we just fixed to reject expired tokens. Without this, an expired but
  // signed license that listed `two_factor_auth` in `features` would still
  // render the toggle as enableable, only to surface a server-side error
  // when the user actually clicked it.
  const licenseInfo = adminSettings?.licenseInfo;
  const licenseFeatures = licenseInfo?.payload?.features ?? [];
  const licensedForEnforce =
    !!licenseInfo?.isValid &&
    (licenseFeatures.includes(LICENSE_FEATURE_TWO_FACTOR) || licenseFeatures.includes('*'));

  useEffect(() => {
    setAllowUserRegistration(data?.allowUserRegistration ?? true);
  }, [data?.allowUserRegistration]);

  const handleSave = async () => {
    try {
      await updateAuthenticationSettings(allowUserRegistration);
      await refetch();
      toast({
        variant: 'success',
        title: 'Authentication settings updated',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  };

  const handleToggleRequire2FA = async (next: boolean) => {
    if (next && !licensedForEnforce) {
      toast({
        variant: 'destructive',
        title: t('twoFactor.adminEnforce.licenseRequired'),
      });
      return;
    }
    if (next && !adminHasOwn2FA) {
      toast({
        variant: 'destructive',
        title: t('twoFactor.adminEnforce.requiresAdminEnabled'),
      });
      return;
    }
    try {
      await updateRequire2FA(next);
      await Promise.all([refetch(), invalidateLicenseScopedCache()]);
      toast({
        variant: 'success',
        title: next
          ? t('twoFactor.adminEnforce.enabledToast')
          : t('twoFactor.adminEnforce.disabledToast'),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <SettingsContent>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold tracking-tight">Authentication</h3>
        <p className="text-sm text-muted-foreground">
          Configure how users can register for this self-hosted instance.
        </p>
      </div>
      <Separator />

      <div className="space-y-8">
        <div className="flex items-start justify-between gap-6 rounded-xl border border-border/60 p-5">
          <div className="space-y-1">
            <div className="text-sm font-medium">Allow new user registration</div>
            <div className="text-sm text-muted-foreground">
              When disabled, only system admins can create new users. Invite-based join flows remain
              available.
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
          ) : (
            <Switch
              checked={allowUserRegistration}
              onCheckedChange={setAllowUserRegistration}
              className="shrink-0 data-[state=unchecked]:bg-input"
            />
          )}
        </div>

        <div className="flex items-start justify-between gap-6 rounded-xl border border-border/60 p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {t('twoFactor.adminEnforce.title')}
              {isLicenseInfoReady && !licensedForEnforce && (
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger className="inline-flex cursor-default">
                      <RiSparklingFill className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {t('twoFactor.adminEnforce.licenseRequired')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('twoFactor.adminEnforce.description')}
            </div>
            {isLicenseInfoReady && licensedForEnforce && !adminHasOwn2FA && (
              <div className="flex items-start gap-1.5 text-sm text-amber-600">
                <RiAlertLine className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {t('twoFactor.adminEnforce.requiresAdminEnabled')}{' '}
                  {project?.id && (
                    <Link
                      to={`/project/${project.id}/settings/account`}
                      className="font-medium underline underline-offset-2 hover:text-amber-700"
                    >
                      {t('twoFactor.adminEnforce.requiresAdminEnabledCta')}
                    </Link>
                  )}
                </span>
              </div>
            )}
            {isLicenseInfoReady && require2FA && !licensedForEnforce && (
              <div className="flex items-start gap-1.5 text-sm text-amber-600">
                <RiAlertLine className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t('twoFactor.adminEnforce.dormantNoLicense')}</span>
              </div>
            )}
          </div>
          {loading ? (
            <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
          ) : (
            <Switch
              checked={require2FA}
              disabled={
                updatingRequire2FA || (!require2FA && (!licensedForEnforce || !adminHasOwn2FA))
              }
              onCheckedChange={handleToggleRequire2FA}
              className="shrink-0 data-[state=unchecked]:bg-input"
            />
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading || updating}>
            Save changes
          </Button>
        </div>
      </div>
    </SettingsContent>
  );
};

AdminAuthenticationPage.displayName = 'AdminAuthenticationPage';
