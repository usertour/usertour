import { Environment } from '@/types/project';
import { useMutation } from '@apollo/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-ui/alert-dialog';
import { deleteEnvironments } from '@usertour-ui/gql';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useToast } from '@usertour-ui/use-toast';

export const EnvironmentDeleteForm = (props: {
  data: Environment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { data, open, onOpenChange, onSubmit } = props;
  const [deleteMutation] = useMutation(deleteEnvironments);
  const { toast } = useToast();

  const handleDeleteSubmit = async () => {
    if (!data) {
      return;
    }
    try {
      const ret = await deleteMutation({
        variables: {
          id: data.id,
        },
      });
      if (ret.data?.deleteEnvironments?.id) {
        toast({
          variant: 'success',
          title: 'The environment has been successfully deleted',
        });
        onSubmit(true);
      }
    } catch (error) {
      onSubmit(false);
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
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
          <AlertDialogAction onClick={handleDeleteSubmit}>Submit</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

EnvironmentDeleteForm.displayName = 'EnvironmentDeleteForm';
