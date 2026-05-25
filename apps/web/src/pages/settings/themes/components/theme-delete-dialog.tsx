import { useDeleteThemeMutation } from '@usertour/hooks';
import { Theme } from '@usertour/types';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useTranslation } from 'react-i18next';

interface ThemeDeleteDialogProps {
  data: Theme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const ThemeDeleteDialog = ({
  data,
  open,
  onOpenChange,
  onSubmit,
}: ThemeDeleteDialogProps) => {
  const { invoke: deleteTheme } = useDeleteThemeMutation();
  const { t } = useTranslation();

  return (
    <DestructiveConfirmDialog
      title={t('settings.common.deleteConfirm.title', {
        resource: t('settings.themes.deleteResource'),
      })}
      description={t('settings.themes.deleteDescription')}
      confirmLabel={t('settings.common.deleteConfirm.confirm', {
        resource: t('settings.themes.deleteResource'),
      })}
      cancelLabel={t('settings.common.cancel')}
      open={open}
      onOpenChange={onOpenChange}
      invoke={() => deleteTheme(data.id)}
      successToast={t('settings.themes.deleteSuccess')}
      failureToast={t('settings.themes.deleteFailure')}
      onSettled={onSubmit}
    />
  );
};

ThemeDeleteDialog.displayName = 'ThemeDeleteDialog';
