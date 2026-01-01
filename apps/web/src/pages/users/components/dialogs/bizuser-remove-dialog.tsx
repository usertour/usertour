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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  const handleConfirm = useCallback(async () => {
    if (!segment?.id) return;

    const success = await removeUsers(bizUserIds, segment.id);
    if (success) {
      onSubmit();
      onOpenChange(false);
    }
  }, [bizUserIds, segment?.id, removeUsers, onSubmit, onOpenChange]);

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
