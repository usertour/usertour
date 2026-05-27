import { Button, Input, Textarea, Separator, Skeleton, useToast } from '@usertour/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetProjectLicenseInfoQuery,
  useInvalidateLicenseScopedCache,
  useUpdateProjectLicenseMutation,
} from '@usertour/hooks';
import { CopyIcon } from 'lucide-react';
import { useCopyToClipboard } from 'react-use';
import { getErrorMessage } from '@usertour/helpers';
import { LicenseStatusBadge, licenseDateClass } from '@/components/license/license-status-badge';

const SubscriptionPlan = ({ projectId }: { projectId: string }) => {
  // License hooks
  const {
    licenseInfo,
    loading: licenseLoading,
    refetch: refetchLicense,
  } = useGetProjectLicenseInfoQuery(projectId);
  const { invoke: updateLicense, loading: updateLicenseLoading } =
    useUpdateProjectLicenseMutation();
  const invalidateLicenseScopedCache = useInvalidateLicenseScopedCache();
  const [licenseInput, setLicenseInput] = useState('');
  const [_, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();
  const { t } = useTranslation();

  const planType = licenseInfo?.payload?.plan || 'free';

  // Handle copy project ID
  const handleCopyProjectId = () => {
    copyToClipboard(projectId);
    toast({
      variant: 'success',
      title: t('settings.subscription.projectIdCopiedToast', { id: projectId }),
    });
  };

  const handleSubmitLicense = async () => {
    const trimmedContent = licenseInput.trim();
    if (!trimmedContent) {
      toast({
        title: t('settings.subscription.uploadLicenseEmpty'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateLicense(projectId, trimmedContent);
      setLicenseInput('');
      await Promise.all([refetchLicense(), invalidateLicenseScopedCache()]);
      toast({
        variant: 'success',
        title: t('settings.subscription.uploadLicenseSuccess'),
      });
    } catch (error) {
      toast({
        title: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <div className="flex flex-col divide-zinc-950/5 dark:divide-white/5">
        <div className="py-8 grid grid-cols-1 sm:grid-cols-8 gap-x-12 gap-y-4">
          <div className="col-span-3 flex flex-col gap-1">
            <div className="flex flex-wrap gap-2">
              <h1 className="text-zinc-950/90 dark:text-white/90">
                {t('settings.subscription.heading')}
              </h1>
            </div>
            <h2 className="text-zinc-950/50 dark:text-white/50 text-sm">
              {t('settings.subscription.description')}
            </h2>
          </div>
          <div className="flex flex-col col-span-5 space-y-2 p-4 pt-1 xl:p-4 rounded-xl bg-zinc-950/5 dark:bg-white/5">
            <div className="flex max-xl:flex-col max-xl:gap-y-3 justify-center xl:items-center xl:justify-between">
              <div className="flex items-center gap-2 grow">
                <div className="flex flex-col w-full">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-950 dark:text-white">
                    {licenseLoading ? (
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-4 w-20 bg-background" />
                        <Skeleton className="h-4 w-16 bg-background" />
                      </div>
                    ) : (
                      <>
                        <span>{t('settings.subscription.currentPlanLabel')}</span>
                        <span className="font-normal text-zinc-950/60 dark:text-white/50 capitalize">
                          {planType}
                        </span>
                        {licenseInfo && (
                          <LicenseStatusBadge
                            isValid={licenseInfo.isValid}
                            isExpired={licenseInfo.isExpired}
                          />
                        )}
                        {licenseInfo?.payload?.exp && (
                          <span className={licenseDateClass(licenseInfo.isExpired)}>
                            {t(
                              licenseInfo.isExpired
                                ? 'settings.subscription.expiredOn'
                                : 'settings.subscription.expiresOn',
                              {
                                date: new Date(licenseInfo.payload.exp * 1000).toLocaleDateString(),
                              },
                            )}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {!licenseLoading &&
                    licenseInfo?.daysRemaining !== null &&
                    licenseInfo?.daysRemaining !== undefined && (
                      <div className="mt-2 text-xs text-zinc-950/60 dark:text-white/50">
                        {t('settings.subscription.daysRemaining', {
                          count: licenseInfo.daysRemaining,
                        })}
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Separator />
        <div className="py-8 flex flex-col gap-8">
          {/* Project ID display with copy button */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">{t('settings.subscription.projectIdLabel')}</div>
              <div className="text-zinc-950/50 dark:text-white/50 text-sm">
                {t('settings.subscription.projectIdDescription')}
              </div>
            </div>
            <div className="flex gap-4">
              <Input value={projectId} disabled className="flex-1" />
              <Button variant="secondary" onClick={handleCopyProjectId} className="h-9">
                <CopyIcon className="w-4 h-4 mr-1" />
                {t('settings.subscription.copy')}
              </Button>
            </div>
          </div>

          {/* License input and upload button */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">
                {t('settings.subscription.uploadLicenseLabel')}
              </div>
              <div className="text-zinc-950/50 dark:text-white/50 text-sm">
                {t('settings.subscription.uploadLicenseDescription')}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Textarea
                placeholder={t('settings.subscription.uploadLicensePlaceholder')}
                value={licenseInput}
                onChange={(e) => setLicenseInput(e.target.value)}
                className="flex-1 font-mono"
                rows={6}
              />
              <div className="flex gap-4">
                <Button
                  disabled={updateLicenseLoading || !licenseInput.trim()}
                  onClick={handleSubmitLicense}
                  className="text-sm px-2 min-w-[36px] h-9 flex-none"
                >
                  {updateLicenseLoading
                    ? t('settings.subscription.uploadLicenseUpdating')
                    : t('settings.subscription.uploadLicenseButton')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubscriptionPlan;
