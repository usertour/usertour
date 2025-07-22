import { useAppContext } from '@/contexts/app-context';
import { useDeleteBizUserMutation } from '@usertour-ui/shared-hooks';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-ui/alert-dialog';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { useToast } from '@usertour-ui/use-toast';
import { useCallback } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';

interface BizUserDeleteFormProps {
  bizUserIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => Promise<void>;
}

export const BizUserDeleteForm = (props: BizUserDeleteFormProps) => {
  const { open, onOpenChange, onSubmit, bizUserIds = [] } = props;
  const { invoke: deleteBizUser, loading } = useDeleteBizUserMutation();
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
      const ret = await deleteBizUser(data);
      if (ret.success) {
        const count = ret.count;
        const userText = count === 1 ? 'user' : 'users';
        toast({
          variant: 'success',
          title: `${count} ${userText} has been successfully deleted`,
        });
        await onSubmit(true);
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

  const isSingleUser = bizUserIds.length === 1;
  const actionText = isSingleUser
    ? 'Yes, delete this user'
    : `Yes, delete ${bizUserIds.length} users`;

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isSingleUser ? 'Confirm deleting the user' : 'Confirm deleting the users'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will delete all traces of the {isSingleUser ? 'user' : 'selected users'} from your
            account. Including in analytics.
            <br />
            {isSingleUser ? 'Confirm deleting the user?' : 'Confirm deleting the users?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} loading={loading} variant="destructive">
            {actionText}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

BizUserDeleteForm.displayName = 'BizUserDeleteForm';
