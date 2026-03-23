import {
  useAdminInstanceSettingsQuery,
  useUpdateInstanceAuthenticationSettingsMutation,
} from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { SettingsContent } from '@/pages/settings/components/content';
import { Separator } from '@usertour-packages/separator';
import { Button } from '@usertour-packages/button';
import { Skeleton } from '@usertour-packages/skeleton';
import { Switch } from '@usertour-packages/switch';
import { getErrorMessage } from '@usertour/helpers';
import { useEffect, useState } from 'react';

export const AdminAuthenticationPage = () => {
  const { data, loading, refetch } = useAdminInstanceSettingsQuery();
  const { invoke: updateAuthenticationSettings, loading: updating } =
    useUpdateInstanceAuthenticationSettingsMutation();
  const { toast } = useToast();
  const [allowUserRegistration, setAllowUserRegistration] = useState(true);

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

  return (
    <SettingsContent>
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight">Authentication</h3>
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
