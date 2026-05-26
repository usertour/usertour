import { DestructiveConfirmDialog } from '@usertour/ui';
import { useDeleteBizUser } from '@/hooks/use-delete-biz-user';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@usertour/use-toast';

interface BizUserDeleteDialogProps {
  bizUserIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const BizUserDeleteDialog = memo((props: BizUserDeleteDialogProps) => {
  const { open, onOpenChange, onSuccess, bizUserIds = [] } = props;
  const { deleteUsers, loading } = useDeleteBizUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const count = bizUserIds.length;

  const handleConfirm = useCallback(async () => {
    if (!bizUserIds || count === 0) {
      toast({ variant: 'destructive', title: t('users.toast.segments.noUsersSelected') });
      return;
    }

    const result = await deleteUsers(bizUserIds);
    if (result.success) {
      toast({
        variant: 'success',
        title: t('users.toast.users.usersDeleted', { count: result.count ?? 0 }),
      });
      onSuccess();
      onOpenChange(false);
    } else {
      toast({ variant: 'destructive', title: result.error ?? t('common.unknownError') });
    }
  }, [bizUserIds, count, deleteUsers, onSuccess, onOpenChange, toast, t]);

  return (
    <DestructiveConfirmDialog
      title={t('users.dialogs.deleteUsers.title', { count })}
      description={t('users.dialogs.deleteUsers.description', { count })}
      confirmLabel={t('users.dialogs.deleteUsers.confirmButton', { count })}
      cancelLabel={t('users.actions.cancel')}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      loading={loading}
    />
  );
});

BizUserDeleteDialog.displayName = 'BizUserDeleteDialog';
