import { Environment } from '@usertour/types';
import { getErrorMessage } from '@usertour/helpers';
import { useDeleteEnvironmentsMutation } from '@usertour/hooks';
import { DeleteConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { useTranslation } from 'react-i18next';

interface EnvironmentDeleteFormProps {
  data: Environment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const EnvironmentDeleteForm = ({
  data,
  open,
  onOpenChange,
  onSubmit,
}: EnvironmentDeleteFormProps) => {
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
    <DeleteConfirmDialog
      resourceLabel={t('settings.environments.deleteResource')}
      name={data.name}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      loading={loading}
      confirmLabel={t('settings.common.submit')}
    />
  );
};

EnvironmentDeleteForm.displayName = 'EnvironmentDeleteForm';
