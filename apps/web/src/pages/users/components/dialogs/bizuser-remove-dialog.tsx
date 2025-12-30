import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { useRemoveUsersFromSegment } from '@/hooks/use-remove-users-from-segment';
import { Segment } from '@usertour/types';
import { useCallback, memo } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';

interface BizUserRemoveDialogProps {
  bizUserIds: string[];
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

export const BizUserRemoveDialog = memo((props: BizUserRemoveDialogProps) => {
  const { bizUserIds, open, onOpenChange, onSubmit, segment } = props;
  const { removeUsers, loading } = useRemoveUsersFromSegment();

  const handleConfirm = useCallback(async () => {
    const success = await removeUsers(bizUserIds, segment.id);
    if (success) {
      onSubmit();
      onOpenChange(false);
    }
  }, [bizUserIds, segment.id, removeUsers, onSubmit, onOpenChange]);

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm removing users from segment</AlertDialogTitle>
          <AlertDialogDescription>
            Confirm removing the selected users from {segment.name}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <LoadingButton onClick={handleConfirm} loading={loading}>
            Yes, remove {bizUserIds.length} users
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

BizUserRemoveDialog.displayName = 'BizUserRemoveDialog';
