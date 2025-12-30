import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { useDeleteSegment } from '@/hooks/use-delete-segment';
import { Segment } from '@usertour/types';
import { useCallback, memo } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';

export const UserSegmentDeleteDialog = memo(
  (props: {
    segment: Segment;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: () => void;
  }) => {
    const { segment, open, onOpenChange, onSubmit } = props;
    const { deleteSegmentById, loading } = useDeleteSegment();

    const handleConfirm = useCallback(async () => {
      if (!segment) {
        return;
      }
      const success = await deleteSegmentById(segment.id, segment.name);
      if (success) {
        onSubmit();
        onOpenChange(false);
      }
    }, [segment, deleteSegmentById, onSubmit, onOpenChange]);

    return (
      <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete segment</AlertDialogTitle>
            <AlertDialogDescription>Confirm deleting {segment.name}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <LoadingButton onClick={handleConfirm} loading={loading} variant="destructive">
              Yes, delete segment
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
);

UserSegmentDeleteDialog.displayName = 'UserSegmentDeleteDialog';
