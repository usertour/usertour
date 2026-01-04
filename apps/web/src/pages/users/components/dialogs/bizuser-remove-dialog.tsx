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
import { useCallback } from 'react';
import { memo } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useTranslation } from 'react-i18next';
import { useToast } from '@usertour-packages/use-toast';

interface BizUserRemoveDialogProps {
  bizUserIds: string[];
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

export const BizUserRemoveDialog = memo((props: BizUserRemoveDialogProps) => {
  const { bizUserIds = [], open, onOpenChange, onSubmit, segment } = props;
  const { removeUsers, loading } = useRemoveUsersFromSegment();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSuccess = useCallback(
    (count: number) => {
      toast({
        variant: 'success',
        title: t('users.toast.segments.usersRemoved', { count }),
      });
      onSubmit();
      onOpenChange(false);
    },
    [onSubmit, onOpenChange, toast, t],
  );

  const handleError = useCallback(
    (errorMessage: string) => {
      toast({
        variant: 'destructive',
        title: errorMessage,
      });
    },
    [toast],
  );

  const handleConfirm = useCallback(async () => {
    if (!segment?.id) {
      handleError('Invalid segment data');
      return;
    }

    if (!bizUserIds || bizUserIds.length === 0) {
      handleError('No users selected');
      return;
    }

    const result = await removeUsers(bizUserIds, segment.id);
    if (result.success) {
      handleSuccess(result.count || 0);
    } else {
      handleError(result.error ?? 'Unknown error');
    }
  }, [bizUserIds, segment?.id, removeUsers, handleSuccess, handleError]);

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('users.dialogs.removeUsersFromSegment.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('users.dialogs.removeUsersFromSegment.description', {
              segmentName: segment?.name ?? '',
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('users.actions.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleConfirm} loading={loading}>
            {t('users.dialogs.removeUsersFromSegment.confirmButton', { count: bizUserIds.length })}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

BizUserRemoveDialog.displayName = 'BizUserRemoveDialog';
