import { useAppContext } from '@/contexts/app-context';
import { useDeleteBizUserMutation } from '@usertour-packages/shared-hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export const useDeleteBizUser = () => {
  const { invoke: deleteBizUser, loading } = useDeleteBizUserMutation();
  const { environment } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  const deleteUsers = useCallback(
    async (userIds: string[]): Promise<boolean> => {
      if (userIds.length === 0 || !environment?.id) {
        return false;
      }

      const data = {
        ids: userIds,
        environmentId: environment.id,
      };

      try {
        const ret = await deleteBizUser(data);
        if (ret.success) {
          const count = ret.count;
          const userType =
            count === 1
              ? t('users.actions.deleteUser').toLowerCase()
              : t('users.dialogs.deleteUsers.titleMultiple').toLowerCase();
          toast({
            variant: 'success',
            title: t('users.toast.users.usersDeleted', { count, userType }),
          });
          return true;
        }
        return false;
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
        return false;
      }
    },
    [deleteBizUser, environment?.id, toast],
  );

  return {
    deleteUsers,
    loading,
    environmentId: environment?.id,
  };
};
