import {
  useAdminInstanceSettingsQuery,
  useUpdateInstanceGeneralSettingsMutation,
} from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { SettingsContent } from '@/pages/settings/components/content';
import { Separator } from '@usertour-packages/separator';
import { Button } from '@usertour-packages/button';
import { Input } from '@usertour-packages/input';
import { Skeleton } from '@usertour-packages/skeleton';
import { Switch } from '@usertour-packages/switch';
import { CopyIcon } from 'lucide-react';
import { getErrorMessage } from '@usertour/helpers';
import { useEffect, useState } from 'react';
import { useCopyToClipboard } from 'react-use';

export const AdminGeneralPage = () => {
  const { data, loading, refetch } = useAdminInstanceSettingsQuery();
  const { invoke: updateGeneralSettings, loading: updating } =
    useUpdateInstanceGeneralSettingsMutation();
  const { toast } = useToast();
  const [, copyToClipboard] = useCopyToClipboard();
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [allowProjectLevelSubscriptionManagement, setAllowProjectLevelSubscriptionManagement] =
    useState(false);

  useEffect(() => {
    setName(data?.name || '');
    setContactEmail(data?.contactEmail || '');
    setAllowProjectLevelSubscriptionManagement(
      data?.allowProjectLevelSubscriptionManagement ?? false,
    );
  }, [data?.allowProjectLevelSubscriptionManagement, data?.contactEmail, data?.name]);

  const handleCopyInstanceId = () => {
    if (!data?.instanceId) {
      return;
    }
    copyToClipboard(data.instanceId);
    toast({
      variant: 'success',
      title: 'Instance ID copied to clipboard',
    });
  };

  const handleSave = async () => {
    try {
      await updateGeneralSettings(
        name.trim() || undefined,
        contactEmail.trim() || undefined,
        allowProjectLevelSubscriptionManagement,
      );
      await refetch();
      toast({
        variant: 'success',
        title: 'General settings updated',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  };

  return (
    <SettingsContent>
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight">General</h3>
        <p className="text-sm text-muted-foreground">
          Manage basic instance information for this self-hosted deployment.
        </p>
      </div>
      <Separator />

      <div className="space-y-8">
        <div className="space-y-2">
          <div className="text-sm font-medium">Instance ID</div>
          <div className="text-sm text-muted-foreground">
            The unique, read-only identifier for this instance.
          </div>
          <div className="flex gap-4">
            {loading ? (
              <Skeleton className="h-10 flex-1" />
            ) : (
              <Input value={data?.instanceId || ''} disabled className="flex-1" />
            )}
            <Button variant="secondary" onClick={handleCopyInstanceId} disabled={loading}>
              <CopyIcon className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Instance Name</div>
          <div className="text-sm text-muted-foreground">
            A friendly name for identifying this self-hosted instance.
          </div>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Input
              placeholder="Enter an instance name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">System Admin Contact Email</div>
          <div className="text-sm text-muted-foreground">
            A contact email for this instance. This does not need to belong to a specific user.
          </div>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Input
              placeholder="admin@example.com"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
            />
          )}
        </div>

        <div className="flex items-start justify-between gap-6 rounded-xl border border-border/60 p-5">
          <div className="space-y-1">
            <div className="text-sm font-medium">Allow project-level subscription management</div>
            <div className="text-sm text-muted-foreground">
              When enabled, self-host project settings will show the Subscription page. When
              disabled, use instance-level subscription management instead. Existing project
              licenses continue to work.
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
          ) : (
            <Switch
              checked={allowProjectLevelSubscriptionManagement}
              onCheckedChange={setAllowProjectLevelSubscriptionManagement}
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

AdminGeneralPage.displayName = 'AdminGeneralPage';
