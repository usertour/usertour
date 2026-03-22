import { Button } from '@usertour-packages/button';
import { Input } from '@usertour-packages/input';
import { Textarea } from '@usertour-packages/textarea';
import { useState } from 'react';
import {
  useGetProjectLicenseInfoQuery,
  useUpdateProjectLicenseMutation,
} from '@usertour-packages/shared-hooks';
import { Separator } from '@usertour-packages/separator';
import { Skeleton } from '@usertour-packages/skeleton';
import { CopyIcon } from 'lucide-react';
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
  const [licenseInput, setLicenseInput] = useState('');
  const [_, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();

  const planType = licenseInfo?.payload?.plan || 'free';

  // Handle copy project ID
  const handleCopyProjectId = () => {
    copyToClipboard(projectId);
    toast({
      variant: 'success',
      title: `Project ID ${projectId} has been copied to clipboard`,
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
      await updateLicense(projectId, trimmedContent);
      setLicenseInput('');
      refetchLicense();
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
        <div className="py-8 flex flex-col gap-8">
          {/* Project ID display with copy button */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">Project ID</div>
              <div className="text-zinc-950/50 dark:text-white/50 text-sm">
                The unique , read-only project id.
              </div>
            </div>
            <div className="flex gap-4">
              <Input value={projectId} disabled className="flex-1" />
              <Button variant="secondary" onClick={handleCopyProjectId} className="h-9">
                <CopyIcon className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
          </div>

          {/* License input and upload button */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">Upload License</div>
              <div className="text-zinc-950/50 dark:text-white/50 text-sm">
                Paste the project license to unlock business/enterprise features. Existing license
                content is not shown after saving.
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
                  disabled={updateLicenseLoading || !licenseInput.trim()}
                  onClick={handleSubmitLicense}
                  className="text-sm px-2 min-w-[36px] h-9 flex-none"
                >
                  {updateLicenseLoading ? 'Updating...' : 'Upload License'}
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
