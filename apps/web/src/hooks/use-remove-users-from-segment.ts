import { useUserListContext } from '@/contexts/user-list-context';
import { useDeleteBizUserOnSegmentMutation } from '@usertour-packages/shared-hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';

interface RemoveUsersResult {
  success: boolean;
  count?: number;
  error?: string;
}

export const useRemoveUsersFromSegment = () => {
  const { invoke: deleteBizUserOnSegment, loading } = useDeleteBizUserOnSegmentMutation();
  const { refetch } = useUserListContext();

  const removeUsers = useCallback(
    async (userIds: string[], segmentId: string): Promise<RemoveUsersResult> => {
      if (userIds.length === 0) {
        return { success: false, error: 'No users selected' };
      }

      const data = {
        bizUserIds: userIds,
        segmentId,
      };

      try {
        const ret = await deleteBizUserOnSegment(data);
        if (ret.success) {
          refetch();
          return { success: true, count: ret.count };
        }
        return { success: false, error: 'Remove operation failed' };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [deleteBizUserOnSegment, refetch],
  );

  return {
    removeUsers,
    loading,
  };
};
