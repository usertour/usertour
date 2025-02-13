import { useAppContext } from '@/contexts/app-context';
import { useUserListContext } from '@/contexts/user-list-context';
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
import { deleteBizUser } from '@usertour-ui/gql';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useToast } from '@usertour-ui/use-toast';
import { useCallback } from 'react';

interface BizUserDeleteFormProps {
  bizUserIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const BizUserDeleteForm = (props: BizUserDeleteFormProps) => {
  const { open, onOpenChange, onSubmit, bizUserIds = [] } = props;
  const [mutation] = useMutation(deleteBizUser);
  const { refetch } = useUserListContext();
  const { environment } = useAppContext();
  const { toast } = useToast();

  const handleDeleteSubmit = useCallback(async () => {
    if (bizUserIds.length === 0 || !environment?.id) {
      return;
    }
    const data = {
      ids: bizUserIds,
      environmentId: environment.id,
    };
    try {
      const ret = await mutation({ variables: { data } });
      if (ret.data?.deleteBizUser?.success) {
        toast({
          variant: 'success',
          title: `${ret.data?.deleteBizUser.count} users has been successfully deleted`,
        });
        await refetch();
        onSubmit(true);
        return;
      }
    } catch (error) {
      onSubmit(false);
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  }, [bizUserIds, environment?.id]);

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm deleting the users</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete all traces of the selected users from your account. Including in
            analytics.
            <br />
            Confirm deleting the users?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteSubmit}>
            Yes, delete {bizUserIds.length} users
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

BizUserDeleteForm.displayName = 'BizUserDeleteForm';
