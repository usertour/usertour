import { useCompanyListContext } from '@/contexts/company-list-context';
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
import { deleteBizCompanyOnSegment } from '@usertour-ui/gql';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { Segment } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import { useCallback } from 'react';

interface BizCompanyRemoveFormProps {
  bizCompanyIds: string[];
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const BizCompanyRemoveForm = (props: BizCompanyRemoveFormProps) => {
  const { bizCompanyIds, open, onOpenChange, onSubmit, segment } = props;
  const [mutation] = useMutation(deleteBizCompanyOnSegment);
  const { refetch } = useCompanyListContext();
  const { toast } = useToast();

  const handleSubmit = useCallback(async () => {
    if (bizCompanyIds.length === 0) {
      return;
    }
    const data = {
      bizCompanyIds,
      segmentId: segment.id,
    };
    try {
      const ret = await mutation({ variables: { data } });
      if (ret.data?.deleteBizCompanyOnSegment?.success) {
        toast({
          variant: 'success',
          title: `${ret.data?.deleteBizCompanyOnSegment.count} users has been successfully removed`,
        });
        await refetch();
        onSubmit(true);
      }
    } catch (error) {
      onSubmit(false);
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  }, [bizCompanyIds, segment]);

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
            Yes, remove {bizCompanyIds.length} users
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

BizCompanyRemoveForm.displayName = 'BizCompanyRemoveForm';
