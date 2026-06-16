import {
  useAdminInstanceSettingsQuery,
  useUpdateInstanceGeneralSettingsMutation,
} from '@usertour/hooks';
import { useToast, Separator, Button, Input, Skeleton, Switch } from '@usertour/ui';
import { SettingsContent } from '@/pages/settings/components/content';
import { CopyIcon } from 'lucide-react';
import { getErrorMessage } from '@usertour/helpers';
import { useEffect, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { useTranslation } from 'react-i18next';

export const AdminGeneralPage = () => {
  const { t } = useTranslation();
  const { data, loading } = useAdminInstanceSettingsQuery();
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
      title: t('admin.general.instanceIdCopied'),
    });
  };

  const handleSave = async () => {
    try {
      await updateGeneralSettings(
        name.trim() || undefined,
        contactEmail.trim() || undefined,
        allowProjectLevelSubscriptionManagement,
      );
      // updateGeneralSettings returns the full settings entity (id + the
      // edited fields), so the normalized cache updates in place.
      toast({
        variant: 'success',
        title: t('admin.general.settingsUpdated'),
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
        <h3 className="text-xl font-semibold tracking-tight">{t('admin.general.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('admin.general.description')}</p>
      </div>
      <Separator />

      <div className="space-y-8">
        <div className="space-y-2">
          <div className="text-sm font-medium">{t('admin.common.instanceId')}</div>
          <div className="text-sm text-muted-foreground">
            {t('admin.general.instanceIdDescription')}
          </div>
          <div className="flex gap-4">
            {loading ? (
              <Skeleton className="h-10 flex-1" />
            ) : (
              <Input value={data?.instanceId || ''} disabled className="flex-1" />
            )}
            <Button variant="secondary" onClick={handleCopyInstanceId} disabled={loading}>
              <CopyIcon className="mr-2 h-4 w-4" />
              {t('admin.common.copy')}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">{t('admin.general.instanceName')}</div>
          <div className="text-sm text-muted-foreground">
            {t('admin.general.instanceNameDescription')}
          </div>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Input
              placeholder={t('admin.general.instanceNamePlaceholder')}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">{t('admin.general.contactEmail')}</div>
          <div className="text-sm text-muted-foreground">
            {t('admin.general.contactEmailDescription')}
          </div>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Input
              placeholder={t('admin.general.contactEmailPlaceholder')}
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
            />
          )}
        </div>

        <div className="flex items-start justify-between gap-6 rounded-xl border border-border/60 p-5">
          <div className="space-y-1">
            <div className="text-sm font-medium">{t('admin.general.allowProjectSubscription')}</div>
            <div className="text-sm text-muted-foreground">
              {t('admin.general.allowProjectSubscriptionDescription')}
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
            {t('admin.common.saveChanges')}
          </Button>
        </div>
      </div>
    </SettingsContent>
  );
};

AdminGeneralPage.displayName = 'AdminGeneralPage';
