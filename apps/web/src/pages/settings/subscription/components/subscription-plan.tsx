import { Button } from '@usertour-packages/button';
import { Input } from '@usertour-packages/input';
import { Textarea } from '@usertour-packages/textarea';
import { useState, useEffect } from 'react';
import {
  useGetProjectLicenseInfoQuery,
  useUpdateProjectLicenseMutation,
} from '@usertour-packages/shared-hooks';
import { Separator } from '@usertour-packages/separator';
import { Skeleton } from '@usertour-packages/skeleton';
import { CopyIcon, RefreshCcwIcon } from 'lucide-react';
import { useCopyToClipboard } from 'react-use';
import { useToast } from '@usertour-packages/use-toast';
import { getErrorMessage } from '@usertour/helpers';

const SubscriptionPlan = ({ projectId }: { projectId: string }) => {
  // License hooks
  const {
    licenseInfo,
    loading: licenseLoading,
    refetch: refetchLicense,
  } = useGetProjectLicenseInfoQuery(projectId);
  const { invoke: updateLicense, loading: updateLicenseLoading } =
    useUpdateProjectLicenseMutation();
  const [licenseInput, setLicenseInput] = useState(licenseInfo?.license || '');
  const [_, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();

  const planType = licenseInfo?.payload?.plan || 'free';

  // Update license input when license info is loaded
  useEffect(() => {
    if (licenseInfo?.license) {
      setLicenseInput(licenseInfo.license);
    }
  }, [licenseInfo?.license]);

  // Handle copy project ID
  const handleCopyProjectId = () => {
    copyToClipboard(projectId);
    toast({
      variant: 'success',
      title: `Project ID ${projectId} has been copied to clipboard`,
    });
  };

  // Handle update license
  const handleUpdateLicense = async () => {
    if (!licenseInput.trim()) {
      toast({
        title: 'License required',
        description: 'Please enter a license key',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateLicense(projectId, licenseInput);
      refetchLicense();
      toast({
        variant: 'success',
        title: 'License updated',
        description: 'License has been updated successfully',
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
                  <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-950 dark:text-white">
                    {licenseLoading ? (
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
                        {licenseInfo?.payload?.exp && (
                          <span className="text-red-500">
                            Expires on{' '}
                            {new Date(licenseInfo.payload.exp * 1000).toLocaleDateString()}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* {licenseInfo?.payload && (
                    <div className="text-xs text-zinc-950/60 dark:text-white/50 mt-2">
                      <div>Project ID: {licenseInfo.payload.projectId}</div>
                      <div>Issuer: {licenseInfo.payload.issuer}</div>
                      <div>Features: {licenseInfo.payload.features.join(', ')}</div>
                      {licenseInfo.daysRemaining !== null && (
                        <div>Days remaining: {licenseInfo.daysRemaining}</div>
                      )}
                    </div>
                  )} */}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Separator />
        <div className="py-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-2">
              <h1 className="text-zinc-950/90 dark:text-white/90">License Settings</h1>
            </div>
            <h2 className="text-zinc-950/50 dark:text-white/50 text-sm">
              Manage your self-hosted license
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              {/* Project ID display with copy button */}
              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium">Project ID</div>
                <div className="flex gap-4">
                  <Input value={projectId} disabled className="flex-1" />
                  <Button variant="secondary" onClick={handleCopyProjectId} className="h-9">
                    <CopyIcon className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>

              {/* License input and update button */}
              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium">License</div>
                <div className="flex flex-col gap-4">
                  <Textarea
                    placeholder="License key..."
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    className="flex-1"
                    rows={6}
                  />
                  <div className="flex gap-4">
                    <Button
                      onClick={handleUpdateLicense}
                      disabled={updateLicenseLoading}
                      className="text-sm gap-0.5 inline-flex items-center justify-center rounded-[10px] disabled:pointer-events-none select-none border border-transparent bg-zinc-950/90 hover:bg-zinc-950/80 ring-zinc-950/10 dark:bg-white dark:hover:bg-white/90 text-white/90 px-2 min-w-[36px] h-9 dark:text-zinc-950 flex-none"
                    >
                      <RefreshCcwIcon className="w-4 h-4 mr-1" />
                      Update License
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubscriptionPlan;
