import { useDeleteBizUserOnSegmentMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface RemoveUsersResult {
  success: boolean;
  count?: number;
  error?: string;
}

// Mirror of `useRemoveCompaniesFromSegment` — owns the mutation only;
// caller owns refetch on success. The shared `BulkRemoveFromSegmentDialog`
// calls both entity hooks, so neither can take a side-channel dependency
// on a specific entity's list state.
export const useRemoveUsersFromSegment = () => {
  const { invoke: deleteBizUserOnSegment, loading } = useDeleteBizUserOnSegmentMutation();
  const { t } = useTranslation();

  const removeUsers = useCallback(
    async (userIds: string[], segmentId: string): Promise<RemoveUsersResult> => {
      if (userIds.length === 0) {
        return { success: false, error: t('users.toast.segments.noUsersSelected') };
      }

      const data = {
        bizUserIds: userIds,
        segmentId,
      };

      try {
        const ret = await deleteBizUserOnSegment(data);
        if (ret.success) {
          return { success: true, count: ret.count };
        }
        return { success: false, error: t('users.toast.segments.removeFailed') };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [deleteBizUserOnSegment, t],
  );

  return {
    removeUsers,
    loading,
  };
};
