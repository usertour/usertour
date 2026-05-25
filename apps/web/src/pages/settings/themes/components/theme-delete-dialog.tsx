import { useDeleteThemeMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { Theme } from '@usertour/types';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
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
  const { invoke: deleteTheme, loading } = useDeleteThemeMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDelete = async () => {
    if (!data) {
      return;
    }
    try {
      const success = await deleteTheme(data.id);
      if (success) {
        toast({
          variant: 'success',
          title: t('settings.themes.deleteSuccess'),
        });
        onSubmit(true);
        onOpenChange(false);
      }
    } catch (error) {
      onSubmit(false);
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <DestructiveConfirmDialog
      title={t('settings.common.deleteConfirm.title', {
        resource: t('settings.themes.deleteResource'),
      })}
      description={t('settings.themes.deleteDescription')}
      confirmLabel={t('settings.common.deleteConfirm.confirm')}
      cancelLabel={t('settings.common.cancel')}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      loading={loading}
    />
  );
};

ThemeDeleteDialog.displayName = 'ThemeDeleteDialog';
