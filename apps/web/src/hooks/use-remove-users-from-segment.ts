import { useUserListContext } from '@/contexts/user-list-context';
import { useDeleteBizUserOnSegmentMutation } from '@usertour-packages/shared-hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export const useRemoveUsersFromSegment = () => {
  const { invoke: deleteBizUserOnSegment, loading } = useDeleteBizUserOnSegmentMutation();
  const { refetch } = useUserListContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  const removeUsers = useCallback(
    async (userIds: string[], segmentId: string): Promise<boolean> => {
      if (userIds.length === 0) {
        return false;
      }

      const data = {
        bizUserIds: userIds,
        segmentId,
      };

      try {
        const ret = await deleteBizUserOnSegment(data);
        if (ret.success) {
          toast({
            variant: 'success',
            title: t('users.toast.segments.usersRemoved', { count: ret.count }),
          });
          refetch();
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
    [deleteBizUserOnSegment, refetch, toast],
  );

  return {
    removeUsers,
    loading,
  };
};
