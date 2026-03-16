import {
  useAdminSettingsQuery,
  useUpdateInstanceLicenseMutation,
} from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { useEffect, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { SettingsContent } from '@/pages/settings/components/content';
import { Separator } from '@usertour-packages/separator';
import { Button } from '@usertour-packages/button';
import { Badge } from '@usertour-packages/badge';
import { Input } from '@usertour-packages/input';
import { Textarea } from '@usertour-packages/textarea';
import { Skeleton } from '@usertour-packages/skeleton';
import { CopyIcon, UploadIcon } from 'lucide-react';
import { getErrorMessage } from '@usertour/helpers';
import Upload from 'rc-upload';
import type { UploadRequestOption } from 'rc-upload/lib/interface';

const LicenseStatusBadge = ({
  isValid,
  isExpired,
}: { isValid: boolean; isExpired?: boolean | null }) => {
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

  useEffect(() => {
    if (licenseInfo?.license) {
      setLicenseInput(licenseInfo.license);
    }
  }, [licenseInfo?.license]);

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

  const handleCustomUploadRequest = (option: UploadRequestOption) => {
    const file = option.file as File;

    if (
      file.type !== 'text/plain' &&
      !file.name.endsWith('.txt') &&
      !file.name.endsWith('.license')
    ) {
      toast({
        title: 'Please select a text file (.txt) or license file (.license)',
        variant: 'destructive',
      });
      option.onError?.(new Error('Invalid file type'));
      return;
    }

    if (file.size > 10 * 1024) {
      toast({
        title: 'Please select a file smaller than 10KB',
        variant: 'destructive',
      });
      option.onError?.(new Error('File too large'));
      return;
    }

    const processFile = async () => {
      try {
        const content = await file.text();
        const trimmedContent = content.trim();

        if (!trimmedContent) {
          toast({
            title: 'Empty file',
            variant: 'destructive',
          });
          option.onError?.(new Error('Empty file'));
          return;
        }

        await updateLicense(trimmedContent);
        setLicenseInput(trimmedContent);
        refetch();
        toast({
          variant: 'success',
          title: 'License updated',
        });
        option.onSuccess?.(trimmedContent);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        toast({
          title: errorMessage,
          variant: 'destructive',
        });
        option.onError?.(new Error(errorMessage));
      }
    };

    processFile();
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
                        {payload?.projectLimit === null || payload?.projectLimit === undefined
                          ? 'Unlimited'
                          : payload.projectLimit}
                      </div>
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
                You can upload an instance license to unlock features across all projects in this
                self-hosted deployment.
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Textarea
                placeholder="Sensitive - write only"
                value={licenseInput}
                onChange={(e) => setLicenseInput(e.target.value)}
                className="flex-1 font-mono"
                rows={6}
                disabled
              />
              <div className="flex gap-4">
                <Upload
                  accept=".txt,.license,text/plain"
                  customRequest={handleCustomUploadRequest}
                  disabled={updating}
                >
                  <Button
                    disabled={updating}
                    className="text-sm gap-0.5 inline-flex items-center justify-center rounded-[10px] disabled:pointer-events-none select-none border border-transparent bg-zinc-950/90 hover:bg-zinc-950/80 ring-zinc-950/10 dark:bg-white dark:hover:bg-white/90 text-white/90 px-2 min-w-[36px] h-9 dark:text-zinc-950 flex-none"
                  >
                    <UploadIcon className="w-4 h-4 mr-1" />
                    {updating ? 'Updating...' : 'Upload License'}
                  </Button>
                </Upload>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsContent>
  );
};

AdminSettingsPage.displayName = 'AdminSettingsPage';
