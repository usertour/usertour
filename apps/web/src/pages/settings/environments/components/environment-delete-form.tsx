import { Environment } from '@usertour/types';
import { getErrorMessage } from '@usertour/helpers';
import { useDeleteEnvironmentsMutation } from '@usertour/hooks';
import { DeleteConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';

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

  const handleDelete = async () => {
    if (!data?.id) {
      toast({ variant: 'destructive', title: 'Invalid environment data' });
      return;
    }
    try {
      const success = await deleteEnvironment(data.id);
      if (success) {
        toast({
          variant: 'success',
          title: 'The environment has been successfully deleted',
        });
        onSubmit(true);
        onOpenChange(false);
      } else {
        toast({ variant: 'destructive', title: 'Failed to delete environment' });
        onSubmit(false);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
      onSubmit(false);
    }
  };

  return (
    <DeleteConfirmDialog
      resourceLabel="environment"
      name={data.name}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      loading={loading}
      confirmLabel="Submit"
    />
  );
};

EnvironmentDeleteForm.displayName = 'EnvironmentDeleteForm';
