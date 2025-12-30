import { useAppContext } from '@/contexts/app-context';
import { useDeleteBizUserMutation } from '@usertour-packages/shared-hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';

export const useDeleteBizUser = () => {
  const { invoke: deleteBizUser, loading } = useDeleteBizUserMutation();
  const { environment } = useAppContext();
  const { toast } = useToast();

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
          const userText = count === 1 ? 'user' : 'users';
          toast({
            variant: 'success',
            title: `${count} ${userText} has been successfully deleted`,
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
