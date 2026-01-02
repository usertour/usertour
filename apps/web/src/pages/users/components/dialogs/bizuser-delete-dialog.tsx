import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { useDeleteBizUser } from '@/hooks/use-delete-biz-user';
import { useCallback } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useTranslation } from 'react-i18next';
import { useToast } from '@usertour-packages/use-toast';

interface BizUserDeleteDialogProps {
  bizUserIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const BizUserDeleteDialog = (props: BizUserDeleteDialogProps) => {
  const { open, onOpenChange, onSuccess, bizUserIds = [] } = props;
  const { deleteUsers, loading } = useDeleteBizUser();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleConfirm = useCallback(async () => {
    const result = await deleteUsers(bizUserIds);
    if (result.success) {
      const count = result.count ?? 0;
      const userType =
        count === 1
          ? t('users.actions.deleteUser').toLowerCase()
          : t('users.dialogs.deleteUsers.titleMultiple').toLowerCase();
      toast({
        variant: 'success',
        title: t('users.toast.users.usersDeleted', { count, userType }),
      });
      onSuccess();
      onOpenChange(false);
    } else {
      toast({
        variant: 'destructive',
        title: result.error ?? 'Unknown error',
      });
    }
  }, [bizUserIds, deleteUsers, onSuccess, onOpenChange, toast, t]);

  const isSingleUser = bizUserIds.length === 1;
  const actionText = isSingleUser
    ? t('users.dialogs.deleteUsers.confirmButtonSingle')
    : t('users.dialogs.deleteUsers.confirmButtonMultiple', { count: bizUserIds.length });

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isSingleUser
              ? t('users.dialogs.deleteUsers.titleSingle')
              : t('users.dialogs.deleteUsers.titleMultiple')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('users.dialogs.deleteUsers.description', {
              userType: isSingleUser
                ? t('users.actions.deleteUser').toLowerCase()
                : t('users.dialogs.deleteUsers.titleMultiple').toLowerCase(),
            })}
            <br />
            {isSingleUser
              ? t('users.dialogs.deleteUsers.descriptionConfirm', {
                  userType: t('users.actions.deleteUser').toLowerCase(),
                })
              : t('users.dialogs.deleteUsers.descriptionConfirm', {
                  userType: t('users.dialogs.deleteUsers.titleMultiple').toLowerCase(),
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('users.actions.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleConfirm} loading={loading} variant="destructive">
            {actionText}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

BizUserDeleteDialog.displayName = 'BizUserDeleteDialog';
