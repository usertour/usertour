import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { useDeleteBizUser } from '@/hooks/use-delete-biz-user';
import { useCallback } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';

interface BizUserDeleteDialogProps {
  bizUserIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const BizUserDeleteDialog = (props: BizUserDeleteDialogProps) => {
  const { open, onOpenChange, onSuccess, bizUserIds = [] } = props;
  const { deleteUsers, loading } = useDeleteBizUser();

  const handleConfirm = useCallback(async () => {
    const success = await deleteUsers(bizUserIds);
    if (success) {
      onSuccess();
      onOpenChange(false);
    }
  }, [bizUserIds, deleteUsers, onSuccess, onOpenChange]);

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
          <LoadingButton onClick={handleConfirm} loading={loading} variant="destructive">
            {actionText}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

BizUserDeleteDialog.displayName = 'BizUserDeleteDialog';
