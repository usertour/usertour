import { useDeleteThemeMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { Theme } from '@usertour/types';
import { DeleteConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { useTranslation } from 'react-i18next';

interface ThemeDeleteFormProps {
  data: Theme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const ThemeDeleteForm = ({ data, open, onOpenChange, onSubmit }: ThemeDeleteFormProps) => {
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
    <DeleteConfirmDialog
      resourceLabel={t('settings.themes.deleteResource')}
      description={t('settings.themes.deleteDescription')}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      loading={loading}
    />
  );
};

ThemeDeleteForm.displayName = 'ThemeDeleteForm';
