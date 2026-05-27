import { Environment } from '@usertour/types';
import { getErrorMessage } from '@usertour/helpers';
import { useDeleteEnvironmentsMutation } from '@usertour/hooks';
import { DestructiveConfirmDialog, useToast } from '@usertour/ui';
import { Trans, useTranslation } from 'react-i18next';

interface EnvironmentDeleteDialogProps {
  data: Environment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const EnvironmentDeleteDialog = (props: EnvironmentDeleteDialogProps) => {
  const { data, open, onOpenChange, onSubmit } = props;
  const { invoke: deleteEnvironment, loading } = useDeleteEnvironmentsMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDelete = async () => {
    if (!data?.id) {
      toast({ variant: 'destructive', title: t('settings.environments.invalidData') });
      return;
    }
    try {
      const success = await deleteEnvironment(data.id);
      if (success) {
        toast({
          variant: 'success',
          title: t('settings.environments.deleteSuccess'),
        });
        onSubmit(true);
        onOpenChange(false);
      } else {
        toast({ variant: 'destructive', title: t('settings.environments.deleteFailure') });
        onSubmit(false);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
      onSubmit(false);
    }
  };

  return (
    <DestructiveConfirmDialog
      title={t('settings.common.deleteConfirm.title', {
        resource: t('settings.environments.deleteResource'),
      })}
      description={
        <Trans
          i18nKey="settings.common.deleteConfirm.description"
          values={{ name: data.name }}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      }
      confirmLabel={t('settings.common.deleteConfirm.confirm', {
        resource: t('settings.environments.deleteResource'),
      })}
      cancelLabel={t('settings.common.cancel')}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      loading={loading}
    />
  );
};

EnvironmentDeleteDialog.displayName = 'EnvironmentDeleteDialog';
