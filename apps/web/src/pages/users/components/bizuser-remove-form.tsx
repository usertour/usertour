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
import { deleteBizUserOnSegment } from '@usertour-ui/gql';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { Segment } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import { useCallback } from 'react';

interface BizUserRemoveFormProps {
  bizUserIds: string[];
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const BizUserRemoveForm = (props: BizUserRemoveFormProps) => {
  const { bizUserIds, open, onOpenChange, onSubmit, segment } = props;
  const [mutation] = useMutation(deleteBizUserOnSegment);
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
      const ret = await mutation({ variables: { data } });
      if (ret.data?.deleteBizUserOnSegment?.success) {
        toast({
          variant: 'success',
          title: `${ret.data?.deleteBizUserOnSegment.count} users has been successfully removed`,
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
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit}>
            Yes, remove {bizUserIds.length} users
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

BizUserRemoveForm.displayName = 'BizUserRemoveForm';
