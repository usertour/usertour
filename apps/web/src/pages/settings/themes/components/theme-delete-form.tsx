import { useDeleteThemeMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { Theme } from '@usertour/types';
import { DeleteConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';

interface ThemeDeleteFormProps {
  data: Theme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const ThemeDeleteForm = ({ data, open, onOpenChange, onSubmit }: ThemeDeleteFormProps) => {
  const { invoke: deleteTheme, loading } = useDeleteThemeMutation();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!data) {
      return;
    }
    try {
      const success = await deleteTheme(data.id);
      if (success) {
        toast({
          variant: 'success',
          title: 'The theme has been successfully deleted',
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
      resourceLabel="theme"
      description="This action cannot be undone. This will permanently delete the theme and all its variations."
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      loading={loading}
    />
  );
};

ThemeDeleteForm.displayName = 'ThemeDeleteForm';
