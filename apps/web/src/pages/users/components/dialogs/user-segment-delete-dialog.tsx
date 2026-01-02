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
import { useCallback } from 'react';
import { memo } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useTranslation } from 'react-i18next';
import { useToast } from '@usertour-packages/use-toast';

interface UserSegmentDeleteDialogProps {
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

export const UserSegmentDeleteDialog = memo((props: UserSegmentDeleteDialogProps) => {
  const { segment, open, onOpenChange, onSubmit } = props;
  const { deleteSegmentById, loading } = useDeleteSegment();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleConfirm = useCallback(async () => {
    if (!segment) {
      return;
    }
    const result = await deleteSegmentById(segment.id);
    if (result.success) {
      toast({
        variant: 'success',
        title: t('users.toast.segments.segmentDeleted', { segmentName: segment.name }),
      });
      onSubmit();
      onOpenChange(false);
    } else {
      toast({
        variant: 'destructive',
        title: result.error ?? 'Unknown error',
      });
    }
  }, [segment, deleteSegmentById, onSubmit, onOpenChange, toast, t]);

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('users.dialogs.deleteSegment.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('users.dialogs.deleteSegment.description', { segmentName: segment?.name ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('users.actions.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleConfirm} loading={loading} variant="destructive">
            {t('users.dialogs.deleteSegment.confirmButton')}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

UserSegmentDeleteDialog.displayName = 'UserSegmentDeleteDialog';
