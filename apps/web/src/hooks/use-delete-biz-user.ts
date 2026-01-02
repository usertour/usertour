import { useAppContext } from '@/contexts/app-context';
import { useDeleteBizUserMutation } from '@usertour-packages/shared-hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';

interface DeleteBizUserResult {
  success: boolean;
  count?: number;
  error?: string;
}

export const useDeleteBizUser = () => {
  const { invoke: deleteBizUser, loading } = useDeleteBizUserMutation();
  const { environment } = useAppContext();
  const environmentId = environment?.id;

  const deleteUsers = useCallback(
    async (userIds: string[]): Promise<DeleteBizUserResult> => {
      if (userIds.length === 0 || !environmentId) {
        return { success: false, error: 'Invalid parameters' };
      }

      const data = {
        ids: userIds,
        environmentId,
      };

      try {
        const ret = await deleteBizUser(data);
        if (ret.success) {
          return { success: true, count: ret.count };
        }
        return { success: false, error: 'Delete operation failed' };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [deleteBizUser, environmentId],
  );

  return {
    deleteUsers,
    loading,
    environmentId: environment?.id,
  };
};
