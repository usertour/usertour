import {
  useAdminSettingsQuery,
  useUpdateInstanceLicenseMutation,
} from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { SettingsContent } from '@/pages/settings/components/content';
import { Separator } from '@usertour-packages/separator';
import { Button } from '@usertour-packages/button';
import { Badge } from '@usertour-packages/badge';
import { Input } from '@usertour-packages/input';
import { Textarea } from '@usertour-packages/textarea';
import { Skeleton } from '@usertour-packages/skeleton';
import { CopyIcon } from 'lucide-react';
import { getErrorMessage } from '@usertour/helpers';

const LicenseStatusBadge = ({
  isValid,
  isExpired,
}: {
  isValid: boolean;
  isExpired?: boolean | null;
}) => {
  if (!isValid) {
    return <Badge variant="destructive">Invalid</Badge>;
  }
  if (isExpired) {
    return <Badge variant="destructive">Expired</Badge>;
  }
  return <Badge variant="outline">Active</Badge>;
};

export const AdminSettingsPage = () => {
  const { data, loading, refetch } = useAdminSettingsQuery();
  const { invoke: updateLicense, loading: updating } = useUpdateInstanceLicenseMutation();
  const { toast } = useToast();
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
      title: `Instance ID ${data.instanceId} has been copied to clipboard`,
    });
  };

  const handleSubmitLicense = async () => {
    const trimmedContent = licenseInput.trim();
    if (!trimmedContent) {
      toast({
        title: 'License cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateLicense(trimmedContent);
      setLicenseInput('');
      refetch();
      toast({
        variant: 'success',
        title: 'License updated',
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
          <h3 className="text-2xl font-semibold tracking-tight">Subscription</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage the instance license and subscription details for this self-hosted deployment.
        </p>
      </div>
      <Separator />

      <div className="flex flex-col divide-zinc-950/5 dark:divide-white/5">
        <div className="py-8 grid grid-cols-1 sm:grid-cols-8 gap-x-12 gap-y-4">
          <div className="col-span-3 flex flex-col gap-1">
            <div className="flex flex-wrap gap-2">
              <h1 className="text-zinc-950/90 dark:text-white/90">Subscription</h1>
            </div>
            <h2 className="text-zinc-950/50 dark:text-white/50 text-sm">
              View and manage your subscription
            </h2>
          </div>
          <div className="flex flex-col col-span-5 space-y-2 p-4 pt-1 xl:p-4 rounded-xl bg-zinc-950/5 dark:bg-white/5">
            <div className="flex max-xl:flex-col max-xl:gap-y-3 justify-center xl:items-center xl:justify-between">
              <div className="flex items-center gap-2 grow">
                <div className="flex flex-col w-full">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-zinc-950 dark:text-white">
                    {loading ? (
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-4 w-20 bg-background" />
                        <Skeleton className="h-4 w-16 bg-background" />
                      </div>
                    ) : (
                      <>
                        <span>Current plan: </span>
                        <span className="font-normal text-zinc-950/60 dark:text-white/50 capitalize">
                          {planType}
                        </span>
                        {licenseInfo?.isValid && (
                          <LicenseStatusBadge
                            isValid={licenseInfo.isValid}
                            isExpired={licenseInfo.isExpired}
                          />
                        )}
                        {payload?.exp && (
                          <span className="text-red-500">
                            Expires on {new Date(payload.exp * 1000).toLocaleDateString()}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {!loading && (
                    <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-zinc-950/60 dark:text-white/50 sm:grid-cols-2">
                      <div>Total Projects: {data?.projectCount ?? 0}</div>
                      <div>
                        Project Limit:{' '}
                        {!hasValidInstanceLicense
                          ? 'No license'
                          : isUnlimitedProjectLimit
                            ? 'Unlimited'
                            : payload?.projectLimit}
                      </div>
                      <div>Projects Using Instance License: {projectsUsingInstanceLicense}</div>
                      {licenseInfo?.daysRemaining !== null &&
                        licenseInfo?.daysRemaining !== undefined && (
                          <div>Days Remaining: {licenseInfo.daysRemaining}</div>
                        )}
                      {payload?.scope && <div>Scope: {payload.scope}</div>}
                    </div>
                  )}
                  {!!licenseInfo?.error && (
                    <div className="mt-3 text-xs text-destructive">{licenseInfo.error}</div>
                  )}
                  {isOverProjectLimit && (
                    <div className="mt-3 text-xs text-destructive">
                      Project usage exceeds the current instance license limit. Existing assignments
                      still work, but no new projects can use the instance license until usage is
                      reduced.
                    </div>
                  )}
                  {!isOverProjectLimit && isUnlimitedProjectLimit && licenseInfo?.isValid && (
                    <div className="mt-3 text-xs text-zinc-950/60 dark:text-white/50">
                      This instance license automatically applies to all projects without a
                      project-specific license.
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
              <div className="text-sm font-medium">Instance ID</div>
              <div className="text-zinc-950/50 dark:text-white/50 text-sm">
                The unique, read-only instance id.
              </div>
            </div>
            <div className="flex gap-4">
              <Input value={data?.instanceId || ''} disabled className="flex-1" />
              <Button variant="secondary" onClick={handleCopyInstanceId} className="h-9">
                <CopyIcon className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">Upload License</div>
              <div className="text-zinc-950/50 dark:text-white/50 text-sm">
                Paste the instance license to unlock features across all projects in this
                self-hosted deployment. Existing license content is not shown after saving.
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Textarea
                placeholder="Sensitive - write only"
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
                  {updating ? 'Updating...' : 'Upload License'}
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
