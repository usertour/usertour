import { useUserListContext } from '@/contexts/user-list-context';
import { useDeleteBizUserOnSegmentMutation } from '@usertour-packages/shared-hooks';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { getErrorMessage } from '@usertour/helpers';
import { Segment } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';

interface BizUserRemoveFormProps {
  bizUserIds: string[];
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const BizUserRemoveForm = (props: BizUserRemoveFormProps) => {
  const { bizUserIds, open, onOpenChange, onSubmit, segment } = props;
  const { invoke: deleteBizUserOnSegment, loading } = useDeleteBizUserOnSegmentMutation();
  const { refetch } = useUserListContext();
  const { toast } = useToast();

  const handleSubmit = useCallback(async () => {
    if (bizUserIds.length === 0) {
      return;
    }
    const data = {
      bizUserIds,
      segmentId: segment.id,
    };
    try {
      const ret = await deleteBizUserOnSegment(data);
      if (ret.success) {
        toast({
          variant: 'success',
          title: `${ret.count} users has been successfully removed`,
        });
        onSubmit(true);
        refetch();
        return;
      }
    } catch (error) {
      onSubmit(false);
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  }, [bizUserIds, segment]);

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
          <LoadingButton onClick={handleSubmit} loading={loading}>
            Yes, remove {bizUserIds.length} users
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

BizUserRemoveForm.displayName = 'BizUserRemoveForm';
