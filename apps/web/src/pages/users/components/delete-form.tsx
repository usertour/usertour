import { useDeleteSegmentMutation } from '@usertour-packages/shared-hooks';
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
import { Segment } from '@usertour-packages/types';
import { useToast } from '@usertour-packages/use-toast';
import { LoadingButton } from '@/components/molecules/loading-button';

export const UserSegmentDeleteForm = (props: {
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { segment, open, onOpenChange, onSubmit } = props;
  const { invoke: deleteSegment, loading } = useDeleteSegmentMutation();
  const { toast } = useToast();

  const handleDeleteSubmit = async () => {
    if (!segment) {
      return;
    }
    try {
      const success = await deleteSegment(segment.id);
      if (success) {
        toast({
          variant: 'success',
          title: `The segment ${segment.name} has been successfully deleted`,
        });
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
  };

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete segment</AlertDialogTitle>
          <AlertDialogDescription>Confirm deleting {segment.name}?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} loading={loading} variant="destructive">
            Yes, delete segment
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

UserSegmentDeleteForm.displayName = 'UserSegmentDeleteForm';
