import { useDeleteLocalizationMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { Localization } from '@usertour/types';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

interface LocalizationDeleteDialogProps {
  data: Localization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const LocalizationDeleteDialog = ({
  data,
  open,
  onOpenChange,
  onSubmit,
}: LocalizationDeleteDialogProps) => {
  const { invoke: deleteLocalization } = useDeleteLocalizationMutation();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDelete = async () => {
    if (!data) {
      return;
    }
    setLoading(true);
    try {
      const success = await deleteLocalization(data.id);
      if (success) {
        toast({
          variant: 'success',
          title: t('settings.localizations.deleteSuccess'),
        });
        onSubmit(true);
        onOpenChange(false);
      }
    } catch (error) {
      onSubmit(false);
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DestructiveConfirmDialog
      title={t('settings.common.deleteConfirm.title', {
        resource: t('settings.localizations.deleteResource'),
      })}
      description={
        <Trans
          i18nKey="settings.common.deleteConfirm.description"
          values={{ name: data.name }}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      }
      confirmLabel={t('settings.common.deleteConfirm.confirm', {
        resource: t('settings.localizations.deleteResource'),
      })}
      cancelLabel={t('settings.common.cancel')}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      loading={loading}
    />
  );
};

LocalizationDeleteDialog.displayName = 'LocalizationDeleteDialog';
