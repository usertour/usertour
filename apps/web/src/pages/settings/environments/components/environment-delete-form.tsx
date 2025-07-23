import { Environment } from '@usertour-packages/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { getErrorMessage } from '@usertour-packages/shared-utils';
import { useDeleteEnvironmentsMutation } from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { LoadingButton } from '@/components/molecules/loading-button';

export const EnvironmentDeleteForm = (props: {
  data: Environment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { data, open, onOpenChange, onSubmit } = props;
  const { invoke: deleteEnvironment, loading } = useDeleteEnvironmentsMutation();
  const { toast } = useToast();

  const handleDeleteSubmit = async () => {
    if (!data?.id) {
      toast({
        variant: 'destructive',
        title: 'Invalid environment data',
      });
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
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to delete environment',
        });
        onSubmit(false);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      onSubmit(false);
    }
  };

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the environment{' '}
            <span className="font-bold text-foreground">{data.name}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} variant="destructive" loading={loading}>
            Submit
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

EnvironmentDeleteForm.displayName = 'EnvironmentDeleteForm';
