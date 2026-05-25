import { useDeleteLocalizationMutation } from '@usertour/hooks';
import { Localization } from '@usertour/types';
import { DestructiveConfirmDialog } from '@usertour/ui';
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
  const { t } = useTranslation();

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
      invoke={() => deleteLocalization(data.id)}
      successToast={t('settings.localizations.deleteSuccess')}
      failureToast={t('settings.localizations.deleteFailure')}
      onSettled={onSubmit}
    />
  );
};

LocalizationDeleteDialog.displayName = 'LocalizationDeleteDialog';
