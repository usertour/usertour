import {
  useAdminSettingsQuery,
  useInvalidateLicenseScopedCache,
  useUpdateInstanceLicenseMutation,
} from '@usertour/hooks';
import { useToast, Separator, Button, Input, Textarea, Skeleton } from '@usertour/ui';
import { useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { SettingsContent } from '@/pages/settings/components/content';
import { CopyIcon } from 'lucide-react';
import { getErrorMessage } from '@usertour/helpers';
import { LicenseStatusBadge, licenseDateClass } from '@/components/license/license-status-badge';
import { useTranslation } from 'react-i18next';

export const AdminSettingsPage = () => {
  const { t } = useTranslation();
  const { data, loading, refetch } = useAdminSettingsQuery();
  const { invoke: updateLicense, loading: updating } = useUpdateInstanceLicenseMutation();
  const { toast } = useToast();
  const invalidateLicenseScopedCache = useInvalidateLicenseScopedCache();
  const [, copyToClipboard] = useCopyToClipboard();
  const [licenseInput, setLicenseInput] = useState('');

  const licenseInfo = data?.licenseInfo;
  const payload = licenseInfo?.payload;
  const planType = payload?.plan || 'free';
  const hasValidInstanceLicense = licenseInfo?.isValid ?? false;
  const projectsUsingInstanceLicense = data?.projectsUsingInstanceLicense ?? 0;
  const isOverProjectLimit = data?.isOverProjectLimit ?? false;
  const isUnlimitedProjectLimit =
    hasValidInstanceLicense &&
    (payload?.projectLimit === null || payload?.projectLimit === undefined);

  const handleCopyInstanceId = () => {
    if (!data?.instanceId) {
      return;
    }
    copyToClipboard(data.instanceId);
    toast({
      variant: 'success',
      title: t('admin.subscription.instanceIdCopied', { instanceId: data.instanceId }),
    });
  };

  const handleSubmitLicense = async () => {
    const trimmedContent = licenseInput.trim();
    if (!trimmedContent) {
      toast({
        title: t('admin.subscription.licenseCannotBeEmpty'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateLicense(trimmedContent);
      setLicenseInput('');
      await Promise.all([refetch(), invalidateLicenseScopedCache()]);
      toast({
        variant: 'success',
        title: t('admin.subscription.licenseUpdated'),
      });
    } catch (error) {
      toast({
        title: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <SettingsContent>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-medium tracking-tight">{t('admin.subscription.title')}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t('admin.subscription.description')}</p>
      </div>
      <Separator />

      <div className="flex flex-col divide-zinc-950/5 dark:divide-white/5">
        <div className="py-8 grid grid-cols-1 sm:grid-cols-8 gap-x-12 gap-y-4">
          <div className="col-span-3 flex flex-col gap-1">
            <div className="flex flex-wrap gap-2">
              <h1 className="text-zinc-950/90 dark:text-white/90">
                {t('admin.subscription.title')}
              </h1>
            </div>
            <h2 className="text-zinc-950/50 dark:text-white/50 text-sm">
              {t('admin.subscription.sectionDescription')}
            </h2>
          </div>
          <div className="flex flex-col col-span-5 space-y-2 p-4 pt-1 xl:p-4 rounded-xl bg-zinc-950/5 dark:bg-white/5">
            <div className="flex max-xl:flex-col max-xl:gap-y-3 justify-center xl:items-center xl:justify-between">
              <div className="flex items-center gap-2 grow">
                <div className="flex flex-col w-full">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-zinc-950 dark:text-white">
                    {loading ? (
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-4 w-20 bg-background dark:bg-muted" />
                        <Skeleton className="h-4 w-16 bg-background dark:bg-muted" />
                      </div>
                    ) : (
                      <>
                        <span>{t('admin.subscription.currentPlanLabel')}</span>
                        <span className="font-normal text-zinc-950/60 dark:text-white/50 capitalize">
                          {planType}
                        </span>
                        {licenseInfo && (
                          <LicenseStatusBadge
                            isValid={licenseInfo.isValid}
                            isExpired={licenseInfo.isExpired}
                          />
                        )}
                        {payload?.exp && (
                          <span className={licenseDateClass(licenseInfo?.isExpired)}>
                            {licenseInfo?.isExpired
                              ? t('admin.subscription.expiredOn', {
                                  date: new Date(payload.exp * 1000).toLocaleDateString(),
                                })
                              : t('admin.subscription.expiresOn', {
                                  date: new Date(payload.exp * 1000).toLocaleDateString(),
                                })}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {!loading && (
                    <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-zinc-950/60 dark:text-white/50 sm:grid-cols-2">
                      <div>
                        {t('admin.subscription.totalProjects', { count: data?.projectCount ?? 0 })}
                      </div>
                      <div>
                        {t('admin.subscription.projectLimit', {
                          limit: !hasValidInstanceLicense
                            ? t('admin.subscription.noLicense')
                            : isUnlimitedProjectLimit
                              ? t('admin.subscription.unlimited')
                              : payload?.projectLimit,
                        })}
                      </div>
                      <div>
                        {t('admin.subscription.projectsUsingLicense', {
                          count: projectsUsingInstanceLicense,
                        })}
                      </div>
                      {licenseInfo?.daysRemaining !== null &&
                        licenseInfo?.daysRemaining !== undefined && (
                          <div>
                            {t('admin.subscription.daysRemaining', {
                              days: licenseInfo.daysRemaining,
                            })}
                          </div>
                        )}
                      {payload?.scope && (
                        <div>{t('admin.subscription.scope', { scope: payload.scope })}</div>
                      )}
                    </div>
                  )}
                  {/* When the license is expired, the red "Expires on …"
                   * date right next to the plan name already conveys the
                   * state; surfacing the error line below would just be a
                   * duplicate. Keep the error visible for non-expiry
                   * problems (bad signature, scope mismatch, etc.). */}
                  {!!licenseInfo?.error && !licenseInfo.isExpired && (
                    <div className="mt-3 text-xs text-destructive">{licenseInfo.error}</div>
                  )}
                  {isOverProjectLimit && (
                    <div className="mt-3 text-xs text-destructive">
                      {t('admin.subscription.overLimitWarning')}
                    </div>
                  )}
                  {!isOverProjectLimit && isUnlimitedProjectLimit && licenseInfo?.isValid && (
                    <div className="mt-3 text-xs text-zinc-950/60 dark:text-white/50">
                      {t('admin.subscription.unlimitedLicenseNote')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Separator />
        <div className="py-8 flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">{t('admin.common.instanceId')}</div>
              <div className="text-zinc-950/50 dark:text-white/50 text-sm">
                {t('admin.subscription.instanceIdDescription')}
              </div>
            </div>
            <div className="flex gap-4">
              <Input value={data?.instanceId || ''} disabled className="flex-1" />
              <Button variant="secondary" onClick={handleCopyInstanceId} className="h-9">
                <CopyIcon className="w-4 h-4 mr-1" />
                {t('admin.common.copy')}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">{t('admin.subscription.uploadLicense')}</div>
              <div className="text-zinc-950/50 dark:text-white/50 text-sm">
                {t('admin.subscription.uploadLicenseDescription')}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Textarea
                placeholder={t('admin.subscription.licensePlaceholder')}
                value={licenseInput}
                onChange={(e) => setLicenseInput(e.target.value)}
                className="flex-1 font-mono"
                rows={6}
              />
              <div className="flex gap-4">
                <Button
                  disabled={updating || !licenseInput.trim()}
                  onClick={handleSubmitLicense}
                  className="text-sm px-2 min-w-[36px] h-9 flex-none"
                >
                  {updating
                    ? t('admin.subscription.updating')
                    : t('admin.subscription.uploadLicense')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsContent>
  );
};

AdminSettingsPage.displayName = 'AdminSettingsPage';
