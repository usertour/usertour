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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
          <AlertDialogTitle>{t('companies.dialogs.deleteSegment.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('companies.dialogs.deleteSegment.description', { segmentName: segment.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('companies.actions.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} variant="destructive" loading={loading}>
            {t('companies.dialogs.deleteSegment.confirmButton')}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

CompanySegmentDeleteDialog.displayName = 'CompanySegmentDeleteDialog';
