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
import { LoadingButton } from '@/components/molecules/loading-button';
import { useDeleteSegmentMutation } from '@usertour-packages/shared-hooks';

interface CompanySegmentDeleteDialogProps {
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const CompanySegmentDeleteDialog = ({
  segment,
  open,
  onOpenChange,
  onSubmit,
}: CompanySegmentDeleteDialogProps) => {
  const { invoke: deleteSegment, loading } = useDeleteSegmentMutation();
  const { toast } = useToast();

  const handleDeleteSubmit = async () => {
    if (!segment?.id) {
      toast({
        variant: 'destructive',
        title: 'Invalid segment data',
      });
      return;
    }

    try {
      const success = await deleteSegment(segment.id);

      if (success) {
        toast({
          variant: 'success',
          title: `The segment "${segment.name}" has been successfully deleted`,
        });
        onSubmit(true);
        onOpenChange(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to delete segment',
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
          <AlertDialogTitle>Delete segment</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the segment{' '}
            <span className="font-bold text-foreground">{segment.name}</span>? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} variant="destructive" loading={loading}>
            Yes, delete segment
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

CompanySegmentDeleteDialog.displayName = 'CompanySegmentDeleteDialog';
