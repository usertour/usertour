import { DestructiveConfirmDialog } from '@usertour/ui';
import { useRemoveUsersFromSegment } from '@/hooks/use-remove-users-from-segment';
import { Segment } from '@usertour/types';
import { memo, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useToast } from '@usertour/use-toast';

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

  const handleConfirm = useCallback(async () => {
    if (!segment?.id) {
      toast({ variant: 'destructive', title: t('users.toast.segments.invalidSegment') });
      return;
    }
    if (!bizUserIds || bizUserIds.length === 0) {
      toast({ variant: 'destructive', title: t('users.toast.segments.noUsersSelected') });
      return;
    }

    const result = await removeUsers(bizUserIds, segment.id);
    if (result.success) {
      toast({
        variant: 'success',
        title: t('users.toast.segments.usersRemoved', { count: result.count || 0 }),
      });
      onSubmit();
      onOpenChange(false);
    } else {
      toast({ variant: 'destructive', title: result.error ?? t('common.unknownError') });
    }
  }, [bizUserIds, segment?.id, removeUsers, onSubmit, onOpenChange, toast, t]);

  return (
    <DestructiveConfirmDialog
      title={t('users.dialogs.removeUsersFromSegment.title')}
      description={
        <Trans
          i18nKey="users.dialogs.removeUsersFromSegment.description"
          values={{ segmentName: segment?.name ?? '' }}
          components={{ strong: <strong className="font-bold text-foreground" /> }}
        />
      }
      confirmLabel={t('users.dialogs.removeUsersFromSegment.confirmButton', {
        count: bizUserIds.length,
      })}
      cancelLabel={t('users.actions.cancel')}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      loading={loading}
    />
  );
});

BizUserRemoveDialog.displayName = 'BizUserRemoveDialog';
